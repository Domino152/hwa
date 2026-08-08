import { KnowledgeBase, type KnowledgeCategory } from '../models/KnowledgeBase.js';
import logger from '../../shared/utils/logger.js';

const seedLogger = logger.child({ module: 'public-content-seed' });

interface SeedEntry {
  category: KnowledgeCategory;
  title: string;
  content: string;
  keywords: string[];
  synonyms: string[];
  examples: string[];
  responseTemplates: string[];
  priority: number;
}

const SEED_ENTRIES: SeedEntry[] = [
  {
    category: 'campus_info',
    title: 'Hindustan Institute of Technology and Science (HITS)',
    content:
      'Hindustan Institute of Technology and Science (HITS) is a deemed university located in Chennai, Tamil Nadu, India. Established in 1985, it offers undergraduate, postgraduate, and doctoral programs in engineering, technology, management, and sciences. The campus spans 250 acres with state-of-the-art infrastructure, modern laboratories, and a vibrant student community. HITS is accredited by NAAC with an A+ grade and approved by AICTE.',
    keywords: ['hits', 'hindustan', 'university', 'college', 'chennai', 'about', 'established'],
    synonyms: ['HITS', 'Hindustan University', 'Hindustan Institute'],
    examples: ['Tell me about HITS', 'What is HITS?', 'About the college'],
    responseTemplates: ['HITS is a deemed university located in Chennai, established in 1985.'],
    priority: 10,
  },
  {
    category: 'academic',
    title: 'B.Tech Admission Process',
    content:
      'Admission to B.Tech programs at HITS is based on JEE Main / TNEA counseling scores. Candidates must have passed 10+2 with Physics, Chemistry, and Mathematics with a minimum of 50% aggregate marks. The admission process includes online application, document verification, and counseling. For management quota seats, contact the admissions office directly.',
    keywords: ['btech', 'b.tech', 'admission', 'jee', 'tnea', 'eligibility', 'apply'],
    synonyms: ['undergraduate admission', 'BTech admission', 'join B.Tech'],
    examples: ['How to get admission in B.Tech?', 'What are the B.Tech admission requirements?'],
    responseTemplates: ['B.Tech admission is based on JEE Main / TNEA counseling scores with minimum 50% in 10+2.'],
    priority: 8,
  },
  {
    category: 'academic',
    title: 'M.Tech / MCA Admission Process',
    content:
      'Admission to M.Tech programs requires a valid GATE score or qualifying examination marks. Candidates must hold a relevant B.E/B.Tech degree with minimum 55% aggregate. MCA admission is based on TANCET / CMAT scores. Applications can be submitted online through the official HITS website.',
    keywords: ['mtech', 'm.tech', 'mca', 'postgraduate', 'gate', 'tancet'],
    synonyms: ['MTech admission', 'MCA admission', 'postgraduate admission'],
    examples: ['How to apply for M.Tech?', 'What is needed for MCA admission?'],
    responseTemplates: ['M.Tech requires a valid GATE score; MCA admission is based on TANCET/CMAT scores.'],
    priority: 8,
  },
  {
    category: 'campus_info',
    title: 'Department of Computer Science and Engineering (CSE)',
    content:
      'The Department of CSE offers B.Tech, M.Tech, and PhD programs. It features advanced computing labs, AI/ML research center, and industry collaborations with Microsoft, Google, and Amazon. The department has 45+ faculty members and a 100% placement record for eligible students.',
    keywords: ['cse', 'computer science', 'cs', 'department'],
    synonyms: ['CSE department', 'Computer Science dept'],
    examples: ['Tell me about CSE department', 'What programs does CSE offer?'],
    responseTemplates: ['The CSE department offers B.Tech, M.Tech, and PhD programs with advanced labs and industry collaborations.'],
    priority: 7,
  },
  {
    category: 'campus_info',
    title: 'Department of Electronics and Communication Engineering (ECE)',
    content:
      'The Department of ECE provides comprehensive education in electronics, communication, VLSI design, and embedded systems. It houses specialized labs for IoT, robotics, and signal processing. Students have published 200+ research papers in the last 5 years.',
    keywords: ['ece', 'electronics', 'communication', 'department'],
    synonyms: ['ECE department', 'Electronics dept'],
    examples: ['Tell me about ECE', 'What does the ECE department do?'],
    responseTemplates: ['The ECE department covers electronics, communication, VLSI design, and embedded systems.'],
    priority: 7,
  },
  {
    category: 'campus_info',
    title: 'Department of Mechanical Engineering',
    content:
      'The Department of Mechanical Engineering offers programs in thermal engineering, design, and manufacturing. It features CNC workshops, 3D printing labs, and CAD/CAM centers. The department has strong industry partnerships with Tata Group, L&T, and Hyundai.',
    keywords: ['mechanical', 'mech', 'department', 'engineering'],
    synonyms: ['Mech department', 'Mechanical Engineering dept'],
    examples: ['Tell me about Mechanical Engineering', 'What is in the Mech department?'],
    responseTemplates: ['The Mechanical Engineering department offers programs in thermal engineering, design, and manufacturing.'],
    priority: 7,
  },
  {
    category: 'courses',
    title: 'B.Tech Programs',
    content:
      'HITS offers B.Tech programs in: Computer Science and Engineering, Electronics and Communication Engineering, Mechanical Engineering, Civil Engineering, Information Technology, Electrical and Electronics Engineering, Automobile Engineering, and Aeronautical Engineering. Duration: 4 years (8 semesters).',
    keywords: ['btech', 'b.tech', 'undergraduate', 'programs', 'courses', 'degrees'],
    synonyms: ['bachelor of technology', 'UG courses', 'undergraduate programs'],
    examples: ['What B.Tech courses are available?', 'List all B.Tech programs'],
    responseTemplates: ['HITS offers B.Tech in CSE, ECE, ME, CE, IT, EEE, Automobile, and Aeronautical Engineering.'],
    priority: 9,
  },
  {
    category: 'courses',
    title: 'M.Tech and MCA Programs',
    content:
      'Postgraduate programs include M.Tech in Computer Science, VLSI Design, Structural Engineering, Thermal Engineering, and MBA. MCA is also offered as a 3-year program. All programs are affiliated to Anna University and approved by AICTE.',
    keywords: ['mtech', 'm.tech', 'mca', 'postgraduate', 'mba', 'masters'],
    synonyms: ['master of technology', 'PG courses', 'postgraduate programs'],
    examples: ['What PG courses are offered?', 'Tell me about M.Tech programs'],
    responseTemplates: ['HITS offers M.Tech in CS, VLSI, Structural, Thermal, and MBA, plus MCA.'],
    priority: 9,
  },
  {
    category: 'placements',
    title: 'Placement Statistics',
    content:
      'HITS has an excellent placement record. Key highlights:\n- Highest Package: ₹45 LPA (2024)\n- Average Package: ₹7.5 LPA\n- Top Recruiters: TCS, Infosys, Wipro, Cognizant, Amazon, Microsoft, Google\n- Placement Rate: 95%+ for eligible students\n- Internship opportunities with 50+ companies\nThe Training and Placement cell provides pre-placement training including aptitude, technical skills, and soft skills development.',
    keywords: ['placement', 'placements', 'salary', 'package', 'recruitment', 'job', 'company'],
    synonyms: ['placements', 'job offers', 'campus recruitment', 'training and placement'],
    examples: ['What are the placement stats?', 'How are placements at HITS?'],
    responseTemplates: ['HITS has 95%+ placement rate with highest package ₹45 LPA and average ₹7.5 LPA.'],
    priority: 10,
  },
  {
    category: 'hostel',
    title: 'Hostel Facilities',
    content:
      'HITS provides separate hostel facilities for men and women with the following amenities:\n- AC and Non-AC rooms (single, double, and triple occupancy)\n- 24/7 Wi-Fi connectivity\n- Mess facility with vegetarian and non-vegetarian options\n- Laundry service\n- Recreational rooms with TV and indoor games\n- 24/7 security with CCTV surveillance\n- Medical facility on campus\nHostel fees: ₹80,000 - ₹1,50,000 per year depending on room type.',
    keywords: ['hostel', 'hostels', 'accommodation', 'mess', 'room', 'boarding', 'residence'],
    synonyms: ['hostel accommodation', 'residence hall', 'boarding'],
    examples: ['Tell me about hostel facilities', 'Are there hostel rooms available?'],
    responseTemplates: ['HITS has separate hostels for men and women with AC/Non-AC rooms, Wi-Fi, mess, and 24/7 security.'],
    priority: 8,
  },
  {
    category: 'campus_info',
    title: 'Bus Routes and Transportation',
    content:
      'HITS operates a fleet of 50+ buses covering all major routes in Chennai:\n- Route 1: T Nagar - Adyar - HITS\n- Route 2: Tambaram - Chromepet - HITS\n- Route 3: Velachery - Sholinganallur - HITS\n- Route 4: Anna Nagar - Kilpauk - HITS\n- Route 5: Porur - Ambattur - HITS\nBus timings: 7:30 AM (to campus) and 4:30 PM / 6:30 PM (return)\nBus pass: ₹15,000 per year. Contact Transport Office for details.',
    keywords: ['bus', 'transport', 'transportation', 'route', 'shuttle', 'commute'],
    synonyms: ['bus service', 'transport facility', 'shuttle'],
    examples: ['Is there a bus facility?', 'Tell me about transportation'],
    responseTemplates: ['HITS operates 50+ buses covering major Chennai routes. Bus pass costs ₹15,000/year.'],
    priority: 7,
  },
  {
    category: 'fees',
    title: 'Scholarships and Financial Aid',
    content:
      'HITS offers various scholarships:\n- Merit Scholarship: 25-100% tuition fee waiver for top performers\n- Sports Scholarship: Up to 50% fee waiver for national/state level athletes\n- Need-based Financial Aid: For economically weaker sections\n- First Generation Graduate Scholarship: 20% fee waiver\n- Alumni Ward Scholarship: 10% fee waiver\nApplications open in July every year. Contact the Financial Aid Office.',
    keywords: ['scholarship', 'scholarships', 'financial aid', 'fee waiver', 'bursary', 'funding'],
    synonyms: ['scholarship', 'financial support', 'fee concession'],
    examples: ['Are there any scholarships?', 'How to apply for financial aid?'],
    responseTemplates: ['HITS offers merit, sports, need-based, first-gen, and alumni scholarships.'],
    priority: 8,
  },
  {
    category: 'library',
    title: 'Library Resources',
    content:
      'The Central Library at HITS is spread over 20,000 sq ft with:\n- 1,00,000+ books and reference materials\n- 10,000+ e-journals (IEEE, Springer, Elsevier, ACM)\n- Digital library with CD/DVD collection\n- 500+ project reports and dissertations\n- Dedicated reading halls with 500 seating capacity\n- 24/7 online access to e-resources\n- Reprography and printing services\nLibrary hours: 8:00 AM - 8:00 PM (Mon-Sat), 9:00 AM - 5:00 PM (Sun)',
    keywords: ['library', 'books', 'reading room', 'journal', 'e-journal', 'bibliography'],
    synonyms: ['central library', 'library resources', 'book bank'],
    examples: ['Tell me about the library', 'What resources does the library have?'],
    responseTemplates: ['The Central Library has 1L+ books, 10K+ e-journals, and 24/7 online access.'],
    priority: 7,
  },
  {
    category: 'campus_info',
    title: 'Sports Facilities',
    content:
      'HITS promotes sports with world-class facilities:\n- Cricket ground with turf pitch\n- Football ground (FIFA standard)\n- Basketball court (indoor and outdoor)\n- Tennis courts (4 clay courts)\n- Badminton courts (indoor)\n- Swimming pool (25m Olympic size)\n- Gymnasium with modern equipment\n- Athletic track (400m)\n- Table tennis and chess rooms\nAnnual sports meet "HITS Olympics" is held in February.',
    keywords: ['sport', 'sports', 'gym', 'cricket', 'football', 'basketball', 'tennis', 'swimming'],
    synonyms: ['sports complex', 'gymnasium', 'athletic facilities'],
    examples: ['What sports facilities are there?', 'Is there a gym on campus?'],
    responseTemplates: ['HITS has cricket ground, football ground, basketball courts, tennis courts, swimming pool, and gym.'],
    priority: 6,
  },
  {
    category: 'events',
    title: 'Annual Events and Festivals',
    content:
      'Major events at HITS:\n- HITS Tech Fest (March): Technical symposium with workshops, hackathons, and paper presentations\n- HITS Cultural Fest (April): Cultural performances, concerts, and celebrity visits\n- HITS Sports Meet (February): Inter-departmental sports competition\n- TechTalk Series (Monthly): Industry experts share insights\n- HackHITS (Bi-annual): 24-hour hackathon\n- Guest Lectures and Seminars: Regular sessions by industry leaders',
    keywords: ['event', 'events', 'fest', 'workshop', 'seminar', 'conference', 'symposium'],
    synonyms: ['fest', 'symposium', 'cultural fest', 'tech fest'],
    examples: ['What events happen at HITS?', 'Tell me about the tech fest'],
    responseTemplates: ['HITS hosts Tech Fest (March), Cultural Fest (April), Sports Meet (Feb), and regular seminars.'],
    priority: 6,
  },
  {
    category: 'campus_info',
    title: 'Contact Information',
    content:
      'HITS Contact Details:\n\nPhone:\n- Admissions: +91 44 2223 0711\n- General Inquiry: +91 44 2223 0703\n- Placement Cell: +91 44 2223 0715\n\nEmail:\n- Admissions: admissions@hits.ac.in\n- General: info@hits.ac.in\n- Placement: placement@hits.ac.in\n\nWebsite: www.hits.ac.in\n\nOffice Hours: 9:00 AM - 5:00 PM (Mon-Sat)',
    keywords: ['contact', 'phone', 'email', 'address', 'reach us', 'helpline', 'number'],
    synonyms: ['contact details', 'phone number', 'email address'],
    examples: ['How to contact HITS?', 'What is the phone number for admissions?'],
    responseTemplates: ['HITS admissions: +91 44 2223 0711, General: +91 44 2223 0703.'],
    priority: 9,
  },
  {
    category: 'campus_info',
    title: 'Campus Location and Directions',
    content:
      'HITS Campus Address:\nHindustan Institute of Technology and Science,\nRajiv Gandhi Salai (OMR), Padur,\nKanchipuram District, Tamil Nadu - 603103.\n\nHow to Reach:\n- By Bus: Routes 5B, 5C, M19 from T Nagar\n- By Metro: Nearest station - Sholinganallur (5 km)\n- By Car: 30 min from Chennai Airport, 45 min from Chennai Central\n- By Train: Nearest station - Chengalpattu (15 km)\n\nGoogle Maps: Search "HITS Chennai"',
    keywords: ['location', 'map', 'direction', 'where is', 'how to reach', 'address', 'campus'],
    synonyms: ['campus address', 'directions to campus', 'how to reach'],
    examples: ['Where is HITS located?', 'How do I get to campus?'],
    responseTemplates: ['HITS is at Rajiv Gandhi Salai (OMR), Padur, Kanchipuram District, Tamil Nadu - 603103.'],
    priority: 8,
  },
  {
    category: 'campus_info',
    title: 'Campus Map and Facilities Layout',
    content:
      'HITS Campus Layout:\n\nMain Gate → Administrative Block → Academic Block A (CSE, IT)\n→ Academic Block B (ECE, EEE) → Academic Block C (Mech, Civil)\n→ Central Library → Auditorium → Sports Complex\n→ Hostel Zone (Men\'s Hostel A/B, Women\'s Hostel) → Mess Hall\n→ Placement Cell → Medical Center → Bank/ATM\n→ Food Court → Shopping Complex\n\nAll buildings are connected by covered walkways. Free Wi-Fi throughout campus.',
    keywords: ['campus map', 'layout', 'buildings', 'facilities', 'where', 'navigation'],
    synonyms: ['campus layout', 'map of campus', 'building locations'],
    examples: ['Where is the library on campus?', 'What buildings are there?'],
    responseTemplates: ['The campus has Academic Blocks A/B/C, Central Library, Auditorium, Sports Complex, and Hostels.'],
    priority: 5,
  },
  {
    category: 'faqs',
    title: 'Frequently Asked Questions',
    content:
      'Q: Is HITS a recognized university?\nA: Yes, HITS is a deemed university recognized by UGC and approved by AICTE.\n\nQ: Does HITS provide placement assistance?\nA: Yes, the Training and Placement cell provides 100% placement assistance with 95%+ placement rate.\n\nQ: Are hostel facilities available?\nA: Yes, separate hostels for men and women with AC and Non-AC options.\n\nQ: What is the semester fee?\nA: Semester fees range from ₹80,000 to ₹1,50,000 depending on the program. Contact admissions for exact details.\n\nQ: Is there a bus facility?\nA: Yes, HITS operates 50+ buses covering all major routes in Chennai.',
    keywords: ['faq', 'frequently asked', 'common question', 'doubt', 'query', 'question'],
    synonyms: ['FAQ', 'common queries', 'general questions'],
    examples: ['Is HITS recognized?', 'Does HITS provide placements?'],
    responseTemplates: ['HITS is UGC recognized, has 95%+ placement rate, separate hostels, and bus facility.'],
    priority: 10,
  },
];

export async function seedPublicContent(): Promise<void> {
  let count = 0;

  for (const entry of SEED_ENTRIES) {
    const exists = await KnowledgeBase.findOne({
      category: entry.category,
      title: entry.title,
    });

    if (!exists) {
      await KnowledgeBase.create({
        category: entry.category,
        title: entry.title,
        content: entry.content,
        keywords: entry.keywords,
        synonyms: entry.synonyms,
        examples: entry.examples,
        responseTemplates: entry.responseTemplates,
        priority: entry.priority,
        isActive: true,
      });
      count++;
    }
  }

  seedLogger.info({ count, total: SEED_ENTRIES.length }, 'Public content seeded');
}
