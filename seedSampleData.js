// Seeds realistic sample plots, customer enquiries, and construction gallery photos.
// Safe to run multiple times (idempotent by plotCode / enquiry email).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectDB = require('./config/db');
const Plot = require('./models/Plot');
const Enquiry = require('./models/Enquiry');
const Construction = require('./models/Construction');
const constructionDefaults = require('./content/constructionDefaults');

const SAMPLE_PLOTS = [
  {
    title: 'East-Facing Park Boulevard Plot',
    plotNumber: 'A-101',
    plotCode: 'VST-101',
    location: 'Sector A · Central Park Frontage',
    area: '2,400 sq. ft.',
    dimensions: '40 ft × 60 ft',
    facing: 'East',
    price: '₹52,00,000',
    description:
      'Prime east-facing residential plot overlooking the central landscaped park with direct 12m paved boulevard access, underground water & power connection points, and stone corner demarcation already installed.',
    features: ['Park Facing', '12m Paved Road', 'Underground Power', 'Clear Title'],
    images: ['/uploads/plot-corner-park.jpg', '/uploads/plot-aerial-overview.jpg', '/uploads/plot-villa-example.jpg'],
    availability: 'Available',
    featured: true,
    published: true,
    order: 0,
  },
  {
    title: 'Corner Villa Plot Near Main Gate',
    plotNumber: 'A-104',
    plotCode: 'VST-104',
    location: 'Sector A · Main Avenue Corner',
    area: '3,000 sq. ft.',
    dimensions: '50 ft × 60 ft',
    facing: 'North-East',
    price: '₹66,00,000',
    description:
      'Dual-road corner plot ideal for a bespoke modern villa. Features extra setback frontage, tree-lined sidewalks, solar LED street lighting, and immediate possession readiness.',
    features: ['Corner Plot', 'North-East Vastu', 'Dual Road Frontage', 'Ready for Registration'],
    images: ['/uploads/plot-aerial-overview.jpg', '/uploads/plot-boulevard-entry.jpg', '/uploads/plot-villa-example.jpg'],
    availability: 'Available',
    featured: true,
    published: true,
    order: 1,
  },
  {
    title: 'Garden-View Avenue Plot',
    plotNumber: 'B-202',
    plotCode: 'VST-202',
    location: 'Sector B · Landscaped Green Belt',
    area: '1,800 sq. ft.',
    dimensions: '30 ft × 60 ft',
    facing: 'North',
    price: '₹39,50,000',
    description:
      'Quiet north-facing plot nestled along the Sector B green belt walking loop. Ideal dimensions for a contemporary 3BHK duplex residence with private garden space.',
    features: ['North Facing', '9m Internal Road', 'Storm Drainage', 'Bank Loan Approved'],
    images: ['/uploads/plot-boulevard-entry.jpg', '/uploads/site-progress-park.jpg', '/uploads/plot-corner-park.jpg'],
    availability: 'Available',
    featured: true,
    published: true,
    order: 2,
  },
  {
    title: 'Clubhouse Promenade Plot',
    plotNumber: 'B-207',
    plotCode: 'VST-207',
    location: 'Sector B · Near Community Pavilion',
    area: '2,700 sq. ft.',
    dimensions: '45 ft × 60 ft',
    facing: 'North-West',
    price: '₹58,50,000',
    description:
      'Generously proportioned family plot steps away from the upcoming community clubhouse and landscaped central plaza. Graded level ground with concrete curbing complete.',
    features: ['Near Clubhouse', 'Level Terrain', 'Solar Streetlights', 'Gated Security'],
    images: ['/uploads/site-progress-park.jpg', '/uploads/plot-aerial-overview.jpg'],
    availability: 'Available',
    featured: false,
    published: true,
    order: 3,
  },
  {
    title: 'Sunlit Enclave Interior Plot',
    plotNumber: 'A-109',
    plotCode: 'VST-109',
    location: 'Sector A · Quiet Residential Lane',
    area: '2,000 sq. ft.',
    dimensions: '40 ft × 50 ft',
    facing: 'East',
    price: '₹43,00,000',
    description:
      'Well-proportioned rectangular plot on a low-traffic residential street in Sector A with complete water and electrical feeder access.',
    features: ['East Facing', 'Low-Traffic Lane', 'Ready Utilities'],
    images: ['/uploads/plot-corner-park.jpg', '/uploads/enclave-twilight.jpg'],
    availability: 'Reserved',
    featured: false,
    published: true,
    order: 4,
  },
  {
    title: 'Signature Boulevard Estate Plot',
    plotNumber: 'A-102',
    plotCode: 'VST-102',
    location: 'Sector A · Central Spine Boulevard',
    area: '3,200 sq. ft.',
    dimensions: '40 ft × 80 ft',
    facing: 'North-East',
    price: '₹70,00,000',
    description:
      'Flagship deep-set boulevard plot facing the 12m main avenue with uninterrupted park views and wide manicured verge.',
    features: ['Main Boulevard', '80ft Depth', 'Corner Access'],
    images: ['/uploads/enclave-twilight.jpg', '/uploads/plot-boulevard-entry.jpg'],
    availability: 'Sold',
    featured: false,
    published: true,
    order: 5,
  },
];

const futureDate = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(10, 30, 0, 0);
  return d;
};

(async () => {
  try {
    await connectDB();

    // 1. Upsert sample plots
    const plotDocs = {};
    for (const p of SAMPLE_PLOTS) {
      const doc = await Plot.findOneAndUpdate({ plotCode: p.plotCode }, p, { upsert: true, new: true });
      plotDocs[p.plotCode] = doc;
    }
    console.log(`Seeded ${Object.keys(plotDocs).length} realistic plots.`);

    // 2. Seed sample enquiries if not already present (idempotent by email)
    const sampleEnquiries = [
      {
        name: 'Aarav Malhotra',
        email: 'aarav.malhotra@example.com',
        phone: '+91 98201 44510',
        visitDate: futureDate(2),
        enquiryType: 'Site Visit',
        message: 'Looking to walk Plot A-101 with my family this Saturday morning at 10:30 AM and review title documents.',
        plotId: plotDocs['VST-101']._id,
        plotTitle: plotDocs['VST-101'].title,
        plotNumber: plotDocs['VST-101'].plotNumber,
        status: 'Visit Scheduled',
        notes: [
          { text: 'Confirmed Saturday 10:30 AM guided tour with site engineer.' },
        ],
        history: [
          { action: 'Site Visit request submitted for East-Facing Park Boulevard Plot' },
          { action: 'Status changed from Pending to Contacted' },
          { action: 'Status changed from Contacted to Visit Scheduled' },
          { action: 'Note added' },
        ],
      },
      {
        name: 'Priya Subramanian',
        email: 'priya.subramanian@example.com',
        phone: '+91 98450 77219',
        visitDate: futureDate(4),
        enquiryType: 'Plot Booking',
        message: 'Interested in reserving the Corner Villa Plot A-104. Please share the itemized cost sheet and bank loan tie-up list.',
        plotId: plotDocs['VST-104']._id,
        plotTitle: plotDocs['VST-104'].title,
        plotNumber: plotDocs['VST-104'].plotNumber,
        status: 'Interested',
        notes: [
          { text: 'Sent cost breakdown and HDFC/SBI approval letter via email.' },
        ],
        history: [
          { action: 'Plot Booking request submitted for Corner Villa Plot Near Main Gate' },
          { action: 'Status changed from Pending to Interested' },
          { action: 'Note added' },
        ],
      },
      {
        name: 'Vikramaditya Rao',
        email: 'vikram.rao@example.com',
        phone: '+91 99102 38841',
        visitDate: futureDate(1),
        enquiryType: 'Site Visit',
        message: 'Would like to inspect Sector B drainage and road work progress before finalizing.',
        plotId: plotDocs['VST-202']._id,
        plotTitle: plotDocs['VST-202'].title,
        plotNumber: plotDocs['VST-202'].plotNumber,
        status: 'Pending',
        notes: [],
        history: [
          { action: 'Site Visit request submitted for Garden-View Avenue Plot' },
        ],
      },
      {
        name: 'Neha & Karan Joshi',
        email: 'neha.joshi@example.com',
        phone: '+91 97654 11208',
        visitDate: futureDate(3),
        enquiryType: 'Site Visit',
        message: 'Comparing 2,400–2,700 sq. ft. options near the park and clubhouse.',
        plotId: plotDocs['VST-207']._id,
        plotTitle: plotDocs['VST-207'].title,
        plotNumber: plotDocs['VST-207'].plotNumber,
        status: 'Contacted',
        notes: [
          { text: 'Spoke on phone; prefers late afternoon tour around 4:30 PM.' },
        ],
        history: [
          { action: 'Site Visit request submitted for Clubhouse Promenade Plot' },
          { action: 'Status changed from Pending to Contacted' },
          { action: 'Note added' },
        ],
      },
      {
        name: 'Rohan Deshpande',
        email: 'rohan.deshpande@example.com',
        phone: '+91 98114 66902',
        visitDate: futureDate(5),
        enquiryType: 'Plot Booking',
        message: 'Completed site walk and token reservation for Plot A-109; awaiting registration slot.',
        plotId: plotDocs['VST-109']._id,
        plotTitle: plotDocs['VST-109'].title,
        plotNumber: plotDocs['VST-109'].plotNumber,
        status: 'Completed',
        notes: [
          { text: 'Token booking processed; legal verification completed by buyer counsel.' },
        ],
        history: [
          { action: 'Plot Booking request submitted for Sunlit Enclave Interior Plot' },
          { action: 'Status changed from Pending to Visit Scheduled' },
          { action: 'Status changed from Visit Scheduled to Completed' },
        ],
      },
      {
        name: 'Meenakshi Iyer',
        email: 'meenakshi.iyer@example.com',
        phone: '+91 98803 55412',
        visitDate: futureDate(6),
        enquiryType: 'Site Visit',
        message: 'General enquiry for upcoming Sector C or available east-facing plots.',
        plotId: null,
        plotTitle: '',
        plotNumber: '',
        status: 'Pending',
        notes: [],
        history: [
          { action: 'Site Visit request submitted' },
        ],
      },
    ];

    let enqAdded = 0;
    for (const eq of sampleEnquiries) {
      const exists = await Enquiry.findOne({ email: eq.email });
      if (!exists) {
        await Enquiry.create(eq);
        enqAdded++;
      }
    }
    console.log(`Sample enquiries ready (${enqAdded} newly added, ${sampleEnquiries.length} total sample entries).`);

    // 3. Attach real photos to construction zones & gallery if currently empty
    let con = await Construction.findOne({ key: 'main' });
    if (!con) con = await Construction.create({ key: 'main', ...constructionDefaults });

    if (!con.gallery || con.gallery.length === 0) {
      con.gallery = [
        { url: '/uploads/plot-boulevard-entry.jpg', caption: 'Completed Main Entrance Gate & 12m Paved Boulevard', stage: 'Completed', takenAt: 'Nov 2026' },
        { url: '/uploads/site-progress-park.jpg', caption: 'Central Park Granite Walking Loop & Survey Pillars', stage: 'Under Construction', takenAt: 'Nov 2026' },
        { url: '/uploads/plot-aerial-overview.jpg', caption: 'Sector A Demarcated Plots & Streetlight Network', stage: 'Completed', takenAt: 'Oct 2026' },
        { url: '/uploads/enclave-twilight.jpg', caption: 'Twilight Lighting & Entrance Pavilion Inspection', stage: 'Completed', takenAt: 'Nov 2026' },
      ];
    }

    const zonePhotoMap = {
      'Z-GATE': ['/uploads/plot-boulevard-entry.jpg', '/uploads/enclave-twilight.jpg'],
      'Z-ROAD-MAIN': ['/uploads/plot-aerial-overview.jpg'],
      'Z-SEC-A': ['/uploads/plot-corner-park.jpg'],
      'Z-PARK': ['/uploads/site-progress-park.jpg'],
      'Z-UTILITY': ['/uploads/zone-utility.jpg'],
      'Z-SEC-B': ['/uploads/zone-sector-b.jpg'],
      'Z-CLUB': ['/uploads/zone-clubhouse.jpg'],
      'Z-SEC-C': ['/uploads/plot-aerial-overview.jpg'],
    };
    con.zones.forEach((z) => {
      if ((!z.photos || z.photos.length === 0) && zonePhotoMap[z.code]) {
        z.photos = zonePhotoMap[z.code];
      }
    });
    con.lastUpdatedAt = new Date();
    await con.save();
    console.log('Construction gallery and zone photos updated.');

    process.exit(0);
  } catch (err) {
    console.error('Sample seed failed:', err.message);
    process.exit(1);
  }
})();
