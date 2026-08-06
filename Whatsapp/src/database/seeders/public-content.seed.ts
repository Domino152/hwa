import { PublicContent, type PublicContentCategory } from '../models/PublicContent.js';
import logger from '../../shared/utils/logger.js';

const seedLogger = logger.child({ module: 'public-content-seed' });

interface SeedEntry {
  category: PublicContentCategory;
  title: string;
  content: string;
  keywords: string[];
}

const SEED_ENTRIES: SeedEntry[] = [
  // About HITS
  {
    category: 'about_hits',
    title: 'Hindustan Institute of Technology and Science (HITS)',
    content:
      'Hindustan Institute of Technology and Science (HITS) is a deemed university located in Chennai, Tamil Nadu, India. Established in 1985, it offers undergraduate, postgraduate, and doctoral programs in engineering, technology, management, and sciences. The campus spans 250 acres with state-of-the-art infrastructure, modern laboratories, and a vibrant student community. HITS is accredited by NAAC with an A+ grade and approved by AICTE.',
    keywords: ['hits', 'hindustan', 'university', 'college', 'chennai', 'about', 'established'],
  },

  // Admissions
  {
    category: 'admissions',
    title: 'B.Tech Admission Process',
    content:
      'Admission to B.Tech programs at HITS is based on JEE Main / TNEA counseling scores. Candidates must have passed 10+2 with Physics, Chemistry, and Mathematics with a minimum of 50% aggregate marks. The admission process includes online application, document verification, and counseling. For management quota seats, contact the admissions office directly.',
    keywords: ['btech', 'b.tech', 'admission', 'jee', 'tnea', 'eligibility', 'apply'],
  },
  {
    category: 'admissions',
    title: 'M.Tech / MCA Admission Process',
    content:
      'Admission to M.Tech programs requires a valid GATE score or qualifying examination marks. Candidates must hold a relevant B.E/B.Tech degree with minimum 55% aggregate. MCA admission is based on TANCET / CMAT scores. Applications can be submitted online through the official HITS website.',
    keywords: ['mtech', 'm.tech', 'mca', 'postgraduate', 'gate', 'tancet'],
  },

  // Departments
  {
    category: 'departments',
    title: 'Department of Computer Science and Engineering (CSE)',
    content:
      'The Department of CSE offers B.Tech, M.Tech, and PhD programs. It features advanced computing labs, AI/ML research center, and industry collaborations with Microsoft, Google, and Amazon. The department has 45+ faculty members and a 100% placement record for eligible students.',
    keywords: ['cse', 'computer science', 'cs', 'department'],
  },
  {
    category: 'departments',
    title: 'Department of Electronics and Communication Engineering (ECE)',
    content:
      'The Department of ECE provides comprehensive education in electronics, communication, VLSI design, and embedded systems. It houses specialized labs for IoT, robotics, and signal processing. Students have published 200+ research papers in the last 5 years.',
    keywords: ['ece', 'electronics', 'communication', 'department'],
  },
  {
    category: 'departments',
    title: 'Department of Mechanical Engineering',
    content:
      'The Department of Mechanical Engineering offers programs in thermal engineering, design, and manufacturing. It features CNC workshops, 3D printing labs, and CAD/CAM centers. The department has strong industry partnerships with Tata Group, L&T, and Hyundai.',
    keywords: ['mechanical', 'mech', 'department', 'engineering'],
  },

  // Courses
  {
    category: 'courses',
    title: 'B.Tech Programs',
    content:
      'HITS offers B.Tech programs in: Computer Science and Engineering, Electronics and Communication Engineering, Mechanical Engineering, Civil Engineering, Information Technology, Electrical and Electronics Engineering, Automobile Engineering, and Aeronautical Engineering. Duration: 4 years (8 semesters).',
    keywords: ['btech', 'b.tech', 'undergraduate', 'programs', 'courses', 'degrees'],
  },
  {
    category: 'courses',
    title: 'M.Tech and MCA Programs',
    content:
      'Postgraduate programs include M.Tech in Computer Science, VLSI Design, Structural Engineering, Thermal Engineering, and MBA. MCA is also offered as a 3-year program. All programs are affiliated to Anna University and approved by AICTE.',
    keywords: ['mtech', 'm.tech', 'mca', 'postgraduate', 'mba', 'masters'],
  },

  // Placements
  {
    category: 'placements',
    title: 'Placement Statistics',
    content:
      'HITS has an excellent placement record. Key highlights:\n- Highest Package: ₹45 LPA (2024)\n- Average Package: ₹7.5 LPA\n- Top Recruiters: TCS, Infosys, Wipro, Cognizant, Amazon, Microsoft, Google\n- Placement Rate: 95%+ for eligible students\n- Internship opportunities with 50+ companies\nThe Training and Placement cell provides pre-placement training including aptitude, technical skills, and soft skills development.',
    keywords: ['placement', 'placements', 'salary', 'package', 'recruitment', 'job', 'company'],
  },

  // Hostel
  {
    category: 'hostel',
    title: 'Hostel Facilities',
    content:
      'HITS provides separate hostel facilities for men and women with the following amenities:\n- AC and Non-AC rooms (single, double, and triple occupancy)\n- 24/7 Wi-Fi connectivity\n- Mess facility with vegetarian and non-vegetarian options\n- Laundry service\n- Recreational rooms with TV and indoor games\n- 24/7 security with CCTV surveillance\n- Medical facility on campus\nHostel fees: ₹80,000 - ₹1,50,000 per year depending on room type.',
    keywords: ['hostel', 'hostels', 'accommodation', 'mess', 'room', 'boarding', 'residence'],
  },

  // Transportation
  {
    category: 'transportation',
    title: 'Bus Routes and Transportation',
    content:
      'HITS operates a fleet of 50+ buses covering all major routes in Chennai:\n- Route 1: T Nagar - Adyar - HITS\n- Route 2: Tambaram - Chromepet - HITS\n- Route 3: Velachery - Sholinganallur - HITS\n- Route 4: Anna Nagar - Kilpauk - HITS\n- Route 5: Porur - Ambattur - HITS\nBus timings: 7:30 AM (to campus) and 4:30 PM / 6:30 PM (return)\nBus pass: ₹15,000 per year. Contact Transport Office for details.',
    keywords: ['bus', 'transport', 'transportation', 'route', 'shuttle', 'commute'],
  },

  // Scholarships
  {
    category: 'scholarships',
    title: 'Scholarships and Financial Aid',
    content:
      'HITS offers various scholarships:\n- Merit Scholarship: 25-100% tuition fee waiver for top performers\n- Sports Scholarship: Up to 50% fee waiver for national/state level athletes\n- Need-based Financial Aid: For economically weaker sections\n- First Generation Graduate Scholarship: 20% fee waiver\n- Alumni Ward Scholarship: 10% fee waiver\nApplications open in July every year. Contact the Financial Aid Office.',
    keywords: ['scholarship', 'scholarships', 'financial aid', 'fee waiver', 'bursary', 'funding'],
  },

  // Campus Facilities
  {
    category: 'campus_facilities',
    title: 'Campus Infrastructure',
    content:
      'HITS campus features:\n- 250-acre lush green campus\n- 10 academic buildings with smart classrooms\n- 50+ advanced laboratories\n- Central library with 1 lakh+ books and e-resources\n- 2 auditoriums (500 and 1000 seating capacity)\n- Olympic-size swimming pool\n- Indoor and outdoor sports facilities\n- Medical center with 24/7 ambulance service\n- Banking and ATM facilities\n- Shopping complex and food court',
    keywords: ['campus', 'facilities', 'infrastructure', 'building', 'lab', 'laboratory'],
  },

  // Library
  {
    category: 'library',
    title: 'Library Resources',
    content:
      'The Central Library at HITS is spread over 20,000 sq ft with:\n- 1,00,000+ books and reference materials\n- 10,000+ e-journals (IEEE, Springer, Elsevier, ACM)\n- Digital library with CD/DVD collection\n- 500+ project reports and dissertations\n- Dedicated reading halls with 500 seating capacity\n- 24/7 online access to e-resources\n- Reprography and printing services\nLibrary hours: 8:00 AM - 8:00 PM (Mon-Sat), 9:00 AM - 5:00 PM (Sun)',
    keywords: ['library', 'books', 'reading room', 'journal', 'e-journal', 'bibliography'],
  },

  // Sports
  {
    category: 'sports',
    title: 'Sports Facilities',
    content:
      'HITS promotes sports with world-class facilities:\n- Cricket ground with turf pitch\n- Football ground (FIFA standard)\n- Basketball court (indoor and outdoor)\n- Tennis courts (4 clay courts)\n- Badminton courts (indoor)\n- Swimming pool (25m Olympic size)\n- Gymnasium with modern equipment\n- Athletic track (400m)\n- Table tennis and chess rooms\nAnnual sports meet "HITS Olympics" is held in February.',
    keywords: ['sport', 'sports', 'gym', 'cricket', 'football', 'basketball', 'tennis', 'swimming'],
  },

  // Clubs
  {
    category: 'clubs',
    title: 'Student Clubs and Societies',
    content:
      'HITS has 25+ student clubs:\n- ACM Student Chapter\n- IEEE Student Branch\n- Robotics Club\n- Coding Club (CodeHive)\n- Photography Club\n- Music Club\n- Dance Club\n- Dramatics Club\n- Literary Society\n- Entrepreneurship Cell\n- National Service Scheme (NSS)\n- National Cadet Corps (NCC)\nClubs organize workshops, competitions, and events throughout the year.',
    keywords: ['club', 'clubs', 'society', 'societies', 'association', 'student club'],
  },

  // Events
  {
    category: 'events',
    title: 'Annual Events and Festivals',
    content:
      'Major events at HITS:\n- HITS Tech Fest (March): Technical symposium with workshops, hackathons, and paper presentations\n- HITS Cultural Fest (April): Cultural performances, concerts, and celebrity visits\n- HITS Sports Meet (February): Inter-departmental sports competition\n- TechTalk Series (Monthly): Industry experts share insights\n- HackHITS (Bi-annual): 24-hour hackathon\n- Guest Lectures and Seminars: Regular sessions by industry leaders',
    keywords: ['event', 'events', 'fest', 'workshop', 'seminar', 'conference', 'symposium'],
  },

  // Contact
  {
    category: 'contact',
    title: 'Contact Information',
    content:
      'HITS Contact Details:\n\nPhone:\n- Admissions: +91 44 2223 0711\n- General Inquiry: +91 44 2223 0703\n- Placement Cell: +91 44 2223 0715\n\nEmail:\n- Admissions: admissions@hits.ac.in\n- General: info@hits.ac.in\n- Placement: placement@hits.ac.in\n\nWebsite: www.hits.ac.in\n\nOffice Hours: 9:00 AM - 5:00 PM (Mon-Sat)',
    keywords: ['contact', 'phone', 'email', 'address', 'reach us', 'helpline', 'number'],
  },

  // Location
  {
    category: 'location',
    title: 'Campus Location and Directions',
    content:
      'HITS Campus Address:\nHindustan Institute of Technology and Science,\nRajiv Gandhi Salai (OMR), Padur,\nKanchipuram District, Tamil Nadu - 603103.\n\nHow to Reach:\n- By Bus: Routes 5B, 5C, M19 from T Nagar\n- By Metro: Nearest station - Sholinganallur (5 km)\n- By Car: 30 min from Chennai Airport, 45 min from Chennai Central\n- By Train: Nearest station - Chengalpattu (15 km)\n\nGoogle Maps: Search "HITS Chennai"',
    keywords: ['location', 'map', 'direction', 'where is', 'how to reach', 'address', 'campus'],
  },

  // Achievements
  {
    category: 'achievements',
    title: 'Achievements and Rankings',
    content:
      'HITS Achievements:\n- NAAC A+ Grade Accreditation\n- NIRF Ranking: 101-150 (Engineering Category)\n- AICTE "Excellent" Rating\n- NBA Accredited (5 programs)\n- 500+ research publications annually\n- 50+ patents filed\n- Winner of Smart India Hackathon 2023\n- Best University Award by Industry Connect 2024\n- 95%+ placement rate consistently',
    keywords: ['achievement', 'achievements', 'award', 'ranking', 'accreditation', 'naac', 'nirf'],
  },

  // FAQ
  {
    category: 'faq',
    title: 'Frequently Asked Questions',
    content:
      'Q: Is HITS a recognized university?\nA: Yes, HITS is a deemed university recognized by UGC and approved by AICTE.\n\nQ: Does HITS provide placement assistance?\nA: Yes, the Training and Placement cell provides 100% placement assistance with 95%+ placement rate.\n\nQ: Are hostel facilities available?\nA: Yes, separate hostels for men and women with AC and Non-AC options.\n\nQ: What is the semester fee?\nA: Semester fees range from ₹80,000 to ₹1,50,000 depending on the program. Contact admissions for exact details.\n\nQ: Is there a bus facility?\nA: Yes, HITS operates 50+ buses covering all major routes in Chennai.',
    keywords: ['faq', 'frequently asked', 'common question', 'doubt', 'query', 'question'],
  },
];

export async function seedPublicContent(): Promise<void> {
  let count = 0;

  for (const entry of SEED_ENTRIES) {
    const exists = await PublicContent.findOne({
      category: entry.category,
      title: entry.title,
    });

    if (!exists) {
      await PublicContent.create({
        category: entry.category,
        title: entry.title,
        content: entry.content,
        keywords: entry.keywords,
        isActive: true,
      });
      count++;
    }
  }

  seedLogger.info({ count, total: SEED_ENTRIES.length }, 'Public content seeded');
}
