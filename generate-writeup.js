const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  SectionType, TableOfContents, LevelFormat,
} = require("docx");
const fs = require("fs");

// ==================== CONSTANTS ====================
const IMG = "/home/z/my-project/upload/extracted_images";
const OUTPUT = "/home/z/my-project/HomeEase_Project_Writeup.docx";
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ==================== HELPER FUNCTIONS ====================
function safeText(value, placeholder) {
  if (value === undefined || value === null || value === "" || String(value) === "NaN") return placeholder || "Please fill in";
  return String(value);
}

function body(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 360, after: 120 },
    keepNext: opts.keepNext || false,
    children: [new TextRun({ text, size: 24, font: { ascii: "Times New Roman", eastAsia: "Times New Roman" }, color: "000000" })],
  });
}

function bodyNoIndent(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { line: 360, after: opts.afterSpacing || 120, before: opts.beforeSpacing || 0 },
    keepNext: opts.keepNext || false,
    children: [new TextRun({ text, size: 24, font: { ascii: "Times New Roman", eastAsia: "Times New Roman" }, color: "000000", bold: opts.bold || false, italics: opts.italic || false })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 480, after: 360, line: 360 },
    children: [new TextRun({ text, bold: true, size: 32, font: { ascii: "Times New Roman", eastAsia: "Times New Roman" }, color: "000000" })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 240, line: 360 },
    children: [new TextRun({ text, bold: true, size: 30, font: { ascii: "Times New Roman", eastAsia: "Times New Roman" }, color: "000000" })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120, line: 360 },
    children: [new TextRun({ text, bold: true, size: 28, font: { ascii: "Times New Roman", eastAsia: "Times New Roman" }, color: "000000" })],
  });
}

// Known image dimensions (width, height in pixels)
const IMG_DIMS = {
  "image1.png": [500, 400], "image2.png": [700, 472], "image3.png": [1391, 802],
  "image4.png": [1024, 1024], "image5.png": [2784, 1188], "image6.png": [300, 223],
  "image7.png": [1600, 1331], "image8.png": [1431, 950], "image9.png": [1432, 955],
  "image10.png": [1432, 955], "image11.png": [512, 365], "image12.png": [1600, 1063],
};

function imgPara(filename, widthInch, heightInch, caption, figNum) {
  const imgBuf = fs.readFileSync(filename);
  const fname = filename.split("/").pop();
  const [origW, origH] = IMG_DIMS[fname] || [600, 400];
  const maxW = 4500; // max width in twips (~3.1 inches) to stay within page margins
  const scale = Math.min(maxW / origW, 1);
  const w = Math.round(origW * scale);
  const h = Math.round(origH * scale);
  const elements = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 60 },
      keepNext: true,
      children: [new ImageRun({ data: imgBuf, transformation: { width: w, height: h }, type: "png" })],
    }),
  ];
  if (caption) {
    elements.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: caption, size: 21, font: { ascii: "Times New Roman", eastAsia: "Times New Roman" }, color: "000000" })],
    }));
  }
  return elements;
}

function threeLineTable(headers, rows) {
  const headerCells = headers.map(h =>
    new TableCell({
      borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" }, top: NB, left: NB, right: NB },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 21, font: { ascii: "Times New Roman" }, color: "000000" })] })],
    })
  );
  const dataRows = rows.map(row =>
    new TableRow({
      cantSplit: true,
      children: row.map(cell =>
        new TableCell({
          borders: { top: NB, bottom: NB, left: NB, right: NB },
          margins: { top: 40, bottom: 40, left: 120, right: 120 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 300 }, children: [new TextRun({ text: cell, size: 20, font: { ascii: "Times New Roman" }, color: "000000" })] })],
        })
      ),
    })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      left: NB, right: NB, insideHorizontal: NB, insideVertical: NB,
    },
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headerCells }),
      ...dataRows,
    ],
  });
}

function tableCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 240 },
    keepNext: true,
    children: [new TextRun({ text, size: 21, font: { ascii: "Times New Roman" }, color: "000000" })],
  });
}

// ==================== COVER PAGE ====================
function buildCover() {
  const infoRows = [
    ["Name", safeText(null, "Student Name")],
    ["Matric No.", safeText(null, "Student Matric Number")],
    ["Department", safeText(null, "Department of Computer Science")],
    ["Faculty", safeText(null, "Faculty of Computing")],
    ["Supervisor", safeText(null, "Supervisor Name")],
  ];
  const infoTable = new Table({
    width: { size: 55, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    borders: { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB },
    rows: infoRows.map(([label, value]) =>
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" }, top: NB, left: NB, right: NB },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: label + ":", size: 28, font: { ascii: "Times New Roman" } })] })],
          }),
          new TableCell({
            borders: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" }, top: NB, left: NB, right: NB },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: value, size: 28, font: { ascii: "Times New Roman" } })] })],
          }),
        ],
      })
    ),
  });

  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 400, line: 920, lineRule: "atLeast" },
      children: [new TextRun({ text: safeText(null, "University Name"), size: 44, bold: true, font: { ascii: "Times New Roman" } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 800, line: 736, lineRule: "atLeast" },
      children: [new TextRun({ text: "Final Year Project", size: 36, font: { ascii: "Times New Roman" } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200, line: 736, lineRule: "atLeast" },
      children: [new TextRun({ text: "DESIGN AND IMPLEMENTATION OF A VIRTUAL SPACE FOR DOMESTIC SERVICES", size: 36, bold: true, font: { ascii: "Times New Roman" } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200, line: 644, lineRule: "atLeast" },
      children: [new TextRun({ text: "(HomeEase Platform)", size: 30, font: { ascii: "Times New Roman", italics: true } })] }),
    infoTable,
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, line: 552, lineRule: "atLeast" },
      children: [new TextRun({ text: safeText(null, "2025"), size: 28, font: { ascii: "Times New Roman" } })] }),
  ];
}

// ==================== ABSTRACT ====================
function buildAbstract() {
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { before: 240, after: 360, line: 360 },
      children: [new TextRun({ text: "Abstract", bold: true, size: 32, font: { ascii: "Times New Roman" }, color: "000000" })] }),
    body("The rapid advancement of digital technologies has transformed how services are delivered across various industries. Domestic services, including cleaning, laundry, childcare, cooking, home repairs, and caregiving, remain essential to households but are still predominantly managed through informal, unstructured channels. This often results in inefficiencies such as unreliable service provision, lack of transparency, pricing inconsistencies, and challenges in matching service providers with clients who need specific skills."),
    body("This project presents the design and implementation of HomeEase, a web-based virtual platform that facilitates efficient, transparent, and user-friendly access to domestic services. The system is developed using Next.js 16 as the primary framework, TypeScript for type-safe programming, Tailwind CSS 4 for responsive user interface design, and Prisma ORM for database management with PostgreSQL as the backend database hosted on Supabase. The platform integrates Paystack payment gateway for secure online transactions, implementing an escrow wallet system that holds payments until service completion, ensuring trust between clients and service providers."),
    body("The system features user registration and authentication, service discovery and booking, real-time messaging, provider verification, feedback and rating systems, and an administrative dashboard for platform management. The development followed an agile methodology with iterative design, implementation, and testing phases. The resulting platform demonstrates a scalable, secure, and user-centered solution for domestic service delivery, addressing the key challenges of accessibility, trust, and efficiency in the informal domestic service sector."),
    new Paragraph({ spacing: { before: 360, after: 120 }, children: [
      new TextRun({ text: "Keywords: ", bold: true, size: 24, font: { ascii: "Times New Roman" }, color: "000000" }),
      new TextRun({ text: "Domestic Services, Virtual Platform, Web Application, Next.js, TypeScript, Paystack, Escrow Payment, Service Matching, PostgreSQL", size: 24, font: { ascii: "Times New Roman" }, color: "000000" }),
    ]}),
  ];
}

// ==================== TOC ====================
function buildTOC() {
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { before: 240, after: 360, line: 360 },
      children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, font: { ascii: "Times New Roman" }, color: "000000" })] }),
    new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
    new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: 'Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select "Update Field."', italics: true, size: 18, color: "888888" })] }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ==================== CHAPTER 1 ====================
function buildChapter1() {
  return [
    h1("CHAPTER ONE"),
    h2("1.1 Introduction / Background"),
    body("Domestic services have existed for as long as human societies have formed households and social hierarchies. In early civilizations, domestic work was closely linked to systems of slavery and servitude. In ancient societies such as those of Egypt, Greece, and Rome, household tasks like cooking, cleaning, and childcare were typically performed by enslaved people or servants, and the presence of domestic workers was a clear sign of wealth and social status."),
    body("During the medieval period, domestic service became a common feature of everyday life, especially in feudal societies. Servants often lived with their employers and were considered part of the household rather than separate workers. Many young people entered domestic service temporarily as a way to gain food, shelter, skills, and social connections. At this time, domestic work was not viewed as a permanent occupation but as a stage in life before marriage or independent work. The early modern period saw domestic service expand further with urban growth and economic change. As towns and cities developed, more households employed servants, and domestic service became one of the largest forms of employment, particularly for women."),
    body("The Industrial Revolution brought major changes to labor and household life. While many workers moved into factories, domestic service continued to thrive, especially among the growing middle classes. Hiring domestic workers became a symbol of respectability, and domestic labor was more clearly defined as paid work. However, it remained poorly regulated, with long hours, low wages, and limited rights, and it continued to be dominated by women."),
    body("In the twentieth century, the demand for live-in domestic workers declined in many parts of the world due to labor reforms, expanded education, and the introduction of household technologies that reduced the need for manual labor. Nevertheless, domestic services did not disappear. Instead, they adapted, increasingly relying on part-time, informal, and migrant labor, often without adequate legal protection."),
    body("Today, domestic services remain essential to households across the globe, particularly in areas such as childcare, elder care, and housekeeping. Although there is growing recognition of domestic work as valuable and legitimate labor, it continues to reflect long-standing issues of inequality related to gender, class, and migration. The history of domestic services therefore reveals both continuity and change, showing how essential household labor has evolved while remaining deeply connected to broader social and economic structures."),
    body("The rapid advancement of digital technologies has transformed how services are delivered across various industries. Domestic services, including cleaning, laundry, childcare, cooking, home repairs, and caregiving, remain essential to households but are still predominantly managed through informal, unstructured channels. This often results in inefficiencies such as unreliable service provision, lack of transparency, pricing inconsistencies, and challenges in matching service providers with clients who need specific skills."),
    body("Domestic services refer to a range of household-related activities carried out to support the daily functioning, comfort, and well-being of individuals or families within a home. These services include tasks such as cleaning, cooking, laundry, childcare, elder care, gardening, and basic household maintenance. Domestic services may be performed by paid domestic workers, either on a full-time, part-time, or casual basis, or by unpaid household members. Historically associated with servitude and gendered labor, domestic services remain essential in modern societies, particularly as families balance work and caregiving responsibilities."),
    body("The concept of a virtual space for domestic service involves creating an online platform or digital environment where domestic service providers and users can interact seamlessly. Such a system can offer features like service listings, provider profiles, real-time bookings, secure payment systems, and customer reviews. A well-developed virtual environment can also promote trust, increase accessibility, and formalize the domestic service sector."),
    body("Given the growing reliance on digital platforms and the increasing need for organized access to domestic assistance, developing a virtual space for domestic services is timely and relevant."),

    // 1.2 Problem Statement
    h2("1.2 Problem Statement"),
    body("The provision of domestic services is largely managed through informal and manual processes, resulting in inefficiencies, lack of scalability, and limited use of digital technologies. The following problems exist:"),
    bodyNoIndent("Existing domestic service platforms often suffer from poor system integration of service discovery, booking, communication, and payment modules; limited scalability and performance under increasing user loads; inadequate security mechanisms for user authentication, data protection, and transactions; and insufficient trust and verification models for service providers.", { beforeSpacing: 120 }),
    bodyNoIndent("Users experience technical challenges such as inefficient search and matching algorithms, lack of real-time scheduling and notification systems, and poorly designed user interfaces with limited accessibility.", { beforeSpacing: 120 }),
    bodyNoIndent("Domestic service providers lack access to digital systems for profile management and service availability, automated job matching and scheduling tools, and transparent and traceable payment processing systems.", { beforeSpacing: 120 }),
    bodyNoIndent("From a system perspective, there is no unified, robust software solution that integrates frontend, backend, and database systems effectively; supports secure, real-time interactions between users and service providers; ensures data privacy, reliability, and fault tolerance; and allows for future extensibility and maintenance.", { beforeSpacing: 120 }),
    body("The problem addressed in this project is the design and implementation of a scalable, secure, and user-centered virtual platform for domestic services that applies appropriate software engineering principles, algorithms, and system architectures to improve the delivery of domestic services."),

    // 1.3 Aim and Objectives
    h2("1.3 Aim and Objectives"),
    bodyNoIndent("Aim:", { bold: true, afterSpacing: 60 }),
    body("To develop a virtual space that facilitates efficient, transparent, and user-friendly access to domestic services through a digital platform."),
    bodyNoIndent("Objectives:", { bold: true, afterSpacing: 60 }),
    body("The objectives for achieving these aims are to:"),
    bodyNoIndent("1. Analyze the existing challenges in current domestic service delivery systems.", { beforeSpacing: 60 }),
    bodyNoIndent("2. Design and implement a user-oriented virtual platform for domestic service providers and clients.", { beforeSpacing: 60 }),
    bodyNoIndent("3. Evaluate the developed platform in comparison with existing ones using user satisfaction, usability and speed of access as metrics.", { beforeSpacing: 60 }),
    bodyNoIndent("4. Evaluate user satisfaction and identify potential improvements.", { beforeSpacing: 60 }),

    // 1.4 Methodology
    h2("1.4 Methodology"),
    body("The development of a virtual space for domestic services adopts a user-centered, iterative methodology that integrates empirical research with structured software development practices. The process begins with a needs assessment phase aimed at understanding the expectations, challenges, and interactions of both service users and domestic service providers. Data is gathered through surveys, interviews, and focus group discussions, complemented by a review of existing digital domestic service platforms. The insights obtained are translated into functional and non-functional system requirements."),
    body("The system implementation follows an agile development methodology, enabling incremental development and continuous feedback. The front end of the virtual space is developed using Next.js 16 with TypeScript for type-safe, responsive, and dynamic user interfaces. Tailwind CSS 4 is used for styling, along with the shadcn/ui component library for consistent design. The backend system is implemented using Next.js API Routes which manage business logic, service scheduling, user authentication, and communication between system components. Data is stored and managed using PostgreSQL through Prisma ORM for scalability and structured data requirements."),
    body("Additional software components are integrated to enhance platform functionality and trust. JSON Web Tokens (JWT) with bcrypt are used for secure user authentication and role-based access control, while the Paystack API is employed for secure payment processing, implementing an escrow wallet system that holds payments until service completion. The platform is hosted on Vercel with PostgreSQL provided by Supabase for database hosting, storage, and scalability. Version control and collaboration are managed using Git and GitHub, with continuous deployment through Vercel's auto-deploy from GitHub."),
    body("Testing and evaluation are conducted throughout development using automated testing tools and manual verification to ensure functionality, performance, and security. Usability testing is carried out with end users to evaluate system efficiency, effectiveness, and satisfaction. Feedback from this stage informs iterative refinements prior to deployment."),
    body("Throughout the development lifecycle, ethical and regulatory considerations are addressed through secure data handling practices, compliance with data protection regulations, and transparent representation of domestic service providers. This methodology ensures that the virtual space is not only technically robust but also socially responsible, scalable, and responsive to the evolving needs of domestic service users and providers."),

    // 1.5 Justification
    h2("1.5 Justification"),
    body("Developing a virtual space for domestic services is justified by several factors:"),
    bodyNoIndent("High demand for reliable domestic help: Many households require daily or periodic support but lack a structured way to access vetted providers.", { beforeSpacing: 120 }),
    bodyNoIndent("Need for formalization: The domestic service industry often operates informally, resulting in inconsistent quality and lack of worker protection.", { beforeSpacing: 120 }),
    bodyNoIndent("Increased digital adoption: More users now rely on online platforms for daily needs, making the virtual environment ideal for service delivery.", { beforeSpacing: 120 }),
    bodyNoIndent("Efficiency and transparency: A virtual space ensures accurate information, secure payments, and improved accountability.", { beforeSpacing: 120 }),
    bodyNoIndent("Improved livelihoods: Providers gain more visibility, stable income opportunities, and professional recognition.", { beforeSpacing: 120 }),

    // 1.6 Expected Outcomes
    h2("1.6 Expected Outcomes"),
    body("At the end of this project, a functional and user-friendly virtual platform for booking domestic services with improved accessibility and convenience for households seeking domestic support would have been developed. The platform would demonstrate the feasibility of applying modern web technologies to formalize and improve the domestic service sector in Nigeria."),
  ];
}

// ==================== CHAPTER 2 ====================
function buildChapter2() {
  return [
    h1("CHAPTER TWO"),
    h1("LITERATURE REVIEW"),

    h2("2.1 Introduction"),
    body("This chapter provides a review of relevant literature that forms the foundation for this study. The purpose of the review is to situate the research within the broader academic and practical context, while also identifying gaps that justify the need for the proposed system. The discussion includes definitions, theoretical framework, and a review of related works, focusing on existing systems and platforms that address similar issues of domestic services that are web-based. Each reviewed work is analyzed with attention to its methodology, strengths, and weaknesses, in order to highlight their contribution as well as their limitations."),
    body("The review helps to identify gaps in existing systems and justifies the need for a robust, secure, and integrated platform that supports domestic services."),

    // 2.2 Theoretical Framework
    h2("2.2 Theoretical Framework"),
    body("The development of a virtual space for domestic services is grounded in theories from information systems, service management, and technology adoption. This study is anchored primarily on the Technology Acceptance Model (TAM), Platform Economy Theory, and Service Quality Theory, which together explain how digital platforms are designed, adopted, and utilized in service-based contexts."),
    body("The Technology Acceptance Model (TAM) posits that users' acceptance and use of a technological system are determined by perceived usefulness and perceived ease of use (Davis, 1989). In the context of a virtual space for domestic services, perceived usefulness refers to the extent to which users believe the platform enhances efficiency in finding, booking, and managing domestic services, while perceived ease of use relates to how simple and intuitive the platform interface is. These factors influence users' intention to adopt and continuously use the virtual space."),
    body("The Platform Economy Theory provides a foundation for understanding virtual spaces as digital intermediaries that facilitate interactions between service providers (domestic workers) and service consumers (households). This theory emphasizes network effects, trust mechanisms, and value co-creation. As more users and service providers participate in the platform, the value of the virtual space increases, thereby improving accessibility, market efficiency, and service availability."),
    body("Additionally, Service Quality Theory explains how users evaluate services delivered through digital platforms. Dimensions such as reliability, responsiveness, assurance, and empathy are adapted to the virtual environment through features like timely service matching, transparent communication, verified credentials, and feedback systems. High perceived service quality enhances user satisfaction and trust, which are essential for sustained platform usage."),
    body("Integrating these theories, the framework proposes that the development of a virtual space for domestic services, characterized by system functionality, usability, security, and service features, influences user acceptance, trust, and satisfaction. These, in turn, affect effective utilization and sustainability of the platform. External factors such as digital literacy, internet accessibility, and regulatory environment may further moderate these relationships."),

    // 2.3 Virtual Space for Domestic Services
    h2("2.3 Virtual Space for Domestic Services"),
    body("A Domestic Service Virtual Space is an integrated, software-driven system designed to support the coordination, administration, and financial management of domestic service transactions within a digitally mediated service ecosystem. Core functional modules of the platform include service discovery and matching, booking and scheduling, service provider profiling and verification, pricing and billing management, transaction processing, performance monitoring, and analytics-based reporting. When integrated with a digital payment system such as Paystack, the platform facilitates secure, cashless financial transactions through online payments, bank transfers, and bank deposit tellers, ensuring end-to-end transaction traceability."),
    body("Digital payment systems have achieved widespread adoption due to their high transaction speed, operational convenience, transparency, and enhanced security infrastructure. Within the domestic services context, digital payments significantly reduce risks associated with cash-based transactions, including theft, misappropriation, and payment disputes. The system enables households to execute remote payments upon service fulfillment, while service providers and platform administrators gain real-time visibility into transaction status, payment confirmation, and revenue flows."),
    body("The integration of service management functionalities with digital payment infrastructure results in a centralized, interoperable platform in which service, financial, and user data are automatically synchronized upon transaction completion. This real-time data integration enhances accountability among platform participants, supports auditability, and improves operational efficiency through automated reconciliation and reporting processes."),

    // 2.4 Web Technologies
    h2("2.4 Web Technologies"),
    body("Web technologies form the backbone of modern web applications. The evolution from Web 1.0 (static web pages) through Web 2.0 (interactive, user-generated content) to the current generation of web applications has enabled increasingly sophisticated platforms for service delivery. Modern web frameworks such as Next.js provide server-side rendering, static generation, and API routes within a single application framework, enabling developers to build full-stack applications with improved performance and developer experience."),
    body("TypeScript, a typed superset of JavaScript, provides static type checking that reduces runtime errors and improves code maintainability. Combined with React's component-based architecture, as used in Next.js, developers can create modular, reusable user interface components. Tailwind CSS provides a utility-first approach to styling that enables rapid, consistent UI development with responsive design capabilities out of the box."),
    body("On the backend, modern web applications use API-driven architectures. Next.js API Routes provide a built-in solution for creating serverless API endpoints without the need for separate backend servers. Combined with PostgreSQL as the database and Prisma ORM for type-safe database access, developers can build robust, scalable applications with clean separation of concerns."),

    // 2.5 Database and DBMS
    h2("2.5 Database and Database Management Systems"),
    body("A database is an organized collection of data stored electronically and designed to be easily accessed, managed, and updated. Databases form the backbone of most modern software systems. A Database Management System (DBMS) is software that allows users to create, store, manage, and retrieve data efficiently and securely. It acts as an interface between the database and users, ensuring data is organized, consistent, and protected from unauthorized access."),
    body("Relational databases organize data into tables consisting of rows and columns, with relationships between tables established using primary and foreign keys. PostgreSQL, used in this project, is a powerful open-source relational database system that supports ACID properties (Atomicity, Consistency, Isolation, Durability), ensuring reliable transaction processing. PostgreSQL is chosen for its robustness, extensibility, and strong support for complex queries and data integrity."),
    body("Prisma ORM serves as the database access layer in this project. It provides type-safe database access, automatic schema migration, and an intuitive query builder that reduces the likelihood of SQL injection and other security vulnerabilities. Prisma's schema definition language allows developers to define data models declaratively, which are then used to generate type-safe client code."),

    // 2.6 Software Process Models
    h2("2.6 Software Process Models"),
    body("A software process model is a structured framework that defines the sequence of activities involved in the development, deployment, and maintenance of software systems. The System Development Life Cycle (SDLC) consists of several interconnected phases: Planning, Analysis, Design, Development, Testing, Implementation, and Maintenance."),
    body("This project adopts the Agile development model, which encourages continuous iterations of development and testing. Each incremental part is developed over an iteration, and each iteration is designed to be small and manageable. Agile development considers that requirements are assumed to change, the system evolves over a series of short iterations, customers are involved during each iteration, and documentation is done only when needed. Agile is particularly suitable for projects with changing requirements, making it ideal for this domestic services platform."),
    ...imgPara(`${IMG}/image1.png`, 0, 0, "Figure 2.1: Waterfall Model", "2.1"),
    ...imgPara(`${IMG}/image3.png`, 0, 0, "Figure 2.2: Iterative Model", "2.2"),
    ...imgPara(`${IMG}/image6.png`, 0, 0, "Figure 2.3: Agile Model", "2.3"),

    // 2.7 Software Hosting
    h2("2.7 Software Hosting"),
    body("Software hosting is a fundamental concept in modern software engineering that refers to the deployment, execution, and management of software applications on remote computing infrastructure. These infrastructures are typically maintained by third-party service providers and accessed through the internet or private networks."),
    body("This project utilizes Vercel as the hosting platform. Vercel is a cloud platform for static sites and serverless functions that provides automatic deployments from Git repositories, edge network distribution for fast global access, and serverless API route execution. The PostgreSQL database is hosted on Supabase, which provides managed PostgreSQL with automatic backups, connection pooling, and real-time capabilities."),
    body("The combination of Vercel and Supabase provides a modern, scalable hosting solution that supports continuous deployment, high availability, and efficient resource utilization. This hosting model aligns with the project's requirements for reliability, security, and accessibility."),

    // 2.8 Related Works
    h2("2.8 Review of Related Works"),
    body("The development of a virtual space for domestic services has attracted increasing research attention. The following table summarizes key related works:"),

    tableCaption("Table 2.1: Summary of Related Works"),
    threeLineTable(
      ["Author & Year", "Title / Focus", "Contribution", "Gap"],
      [
        ["Khatri & Gupta (2020)", "Digital Platforms for Household Services", "Connected households with service providers online", "Did not explain interactive virtual space"],
        ["Adeyemi & Fatile (2021)", "Technology Adoption in Domestic Work Management", "Examined factors influencing digital adoption", "Lacked unified, user-friendly platform framework"],
        ["Rana et al. (2019)", "User Experience in Service Delivery Apps", "Identified design elements improving booking experiences", "Did not consider domestic services specifically"],
        ["Indravasan et al. (2018)", "Online System for Household Services", "Web-based system for household task management", "Limited scalability; no real-time tracking"],
        ["Chen et al. (2021)", "Digital Platforms and Household Services", "Examined digital adoption in household services", "Did not propose a virtual space framework"],
        ["Aishwaryalakshmi et al. (2024)", "Digital Platform for Domestic Services", "Implemented registration, booking, and communication", "Lacked scalability, security, and usability testing"],
        ["Meyanban et al. (2024)", "Online Platforms and Domestic Workers", "Explored digital inclusion and service accessibility", "No technical framework or empirical evaluation"],
        ["Rakhewar et al. (2023)", "Web-based Service Platform", "Connected customers with local service providers", "Lacked intelligent matching and mobile support"],
        ["Orth & Baum (2024)", "Researching Digital Domestic Platforms", "Ethical and structural challenges in platform research", "No technical design or system architecture proposed"],
        ["Pais & Zanoni (2024)", "Platform-mediated Domestic Service", "Analyzed algorithmic management and governance", "Focused on labor relations, not technical construction"],
      ]
    ),
    body("These related works reveal that while significant progress has been made in understanding and conceptualizing domestic service platforms, there remains a gap in the development of robust, secure, and user-centered systems that are technically implemented and empirically evaluated. The proposed HomeEase platform addresses these gaps by providing a comprehensive, fully implemented solution with modern web technologies, secure payment integration, and user-centered design."),
  ];
}

// ==================== CHAPTER 3 ====================
function buildChapter3() {
  return [
    h1("CHAPTER THREE"),
    h1("SYSTEM DESIGN AND METHODOLOGY"),

    h2("3.1 Introduction"),
    body("This chapter presents the system design and methodology for the HomeEase virtual platform for domestic services. It covers the system requirements, software and hardware specifications, system architecture, and design diagrams including use case diagrams, context diagrams, data flow diagrams, and entity-relationship diagrams. The design follows software engineering best practices to ensure the system is efficient, scalable, and maintainable."),

    // 3.2 System Requirements
    h2("3.2 System Requirements"),
    h3("3.2.1 Functional Requirements"),
    body("The functional requirements define what the system must do. These are the core capabilities that the platform must deliver to meet user needs:"),
    bodyNoIndent("1. User Management: Users and service providers must be able to register, create profiles, and authenticate securely. Providers must create service portfolios detailing skills, availability, rates, and locations. Administrators must have access to manage and verify profiles.", { beforeSpacing: 120 }),
    bodyNoIndent("2. Service Request and Booking: Users can submit service requests specifying service type, date, time, and location. The system validates the request and stores it. Providers receive real-time notifications and can accept or reject requests.", { beforeSpacing: 120 }),
    bodyNoIndent("3. Intelligent Matching and Scheduling: The system evaluates providers based on skill relevance, location proximity, availability, cost, and reputation. Optimal provider recommendations are generated automatically.", { beforeSpacing: 120 }),
    bodyNoIndent("4. Communication Module: The platform provides secure messaging between users and providers with real-time notifications about service updates.", { beforeSpacing: 120 }),
    bodyNoIndent("5. Payment Processing: Users make secure digital payments through Paystack. Payments are held in an escrow wallet until service completion to ensure trust. The system maintains a complete transaction history.", { beforeSpacing: 120 }),
    bodyNoIndent("6. Feedback and Rating System: Users rate providers based on quality, timeliness, and professionalism. Reputation scores update dynamically and influence future provider selection.", { beforeSpacing: 120 }),
    bodyNoIndent("7. Administrative Functions: Administrators verify provider credentials, approve accounts, monitor activity, resolve disputes, and generate reports.", { beforeSpacing: 120 }),

    h3("3.2.2 Non-Functional Requirements"),
    bodyNoIndent("1. Usability: The system provides a clean, intuitive interface accessible to users with minimal technical expertise.", { beforeSpacing: 120 }),
    bodyNoIndent("2. Performance: Service requests, notifications, and payments respond within 2-3 seconds under normal load conditions.", { beforeSpacing: 120 }),
    bodyNoIndent("3. Security: Data confidentiality, integrity, and availability are ensured through JWT authentication, encryption, and access control mechanisms.", { beforeSpacing: 120 }),
    bodyNoIndent("4. Scalability: The architecture supports horizontal and vertical scaling to accommodate increasing users and transactions.", { beforeSpacing: 120 }),
    bodyNoIndent("5. Reliability and Availability: The platform maintains high availability with minimal downtime, backup mechanisms, and failover strategies.", { beforeSpacing: 120 }),
    bodyNoIndent("6. Compatibility: The platform is accessible on multiple devices including desktops, tablets, and smartphones with cross-browser support.", { beforeSpacing: 120 }),

    // 3.3 Software Requirements
    h2("3.3 System Software and Hardware Requirements"),
    h3("3.3.1 Software Requirements"),
    tableCaption("Table 3.1: System Software Requirements"),
    threeLineTable(
      ["S/N", "Software Component", "Technology Used", "Purpose"],
      [
        ["1", "Operating System", "Windows, Linux, or macOS", "Platform for development and deployment"],
        ["2", "Hosting Platform", "Vercel", "Hosts the web application and handles deployments"],
        ["3", "Database System", "PostgreSQL (Supabase)", "Stores user data, service records, and transactions"],
        ["4", "ORM", "Prisma", "Type-safe database access and schema management"],
        ["5", "Frontend Framework", "Next.js 16 + TypeScript + Tailwind CSS 4", "Provides interactive and responsive user interface"],
        ["6", "UI Component Library", "shadcn/ui + Lucide Icons", "Consistent, accessible design components"],
        ["7", "State Management", "Zustand", "Client-side state management"],
        ["8", "Authentication", "JWT + bcrypt", "Secure user authentication and role-based access"],
        ["9", "Payment Gateway", "Paystack", "Enables secure online payments with escrow wallet"],
        ["10", "Web Browser", "Chrome, Edge, or Firefox", "System access and testing"],
      ]
    ),

    h3("3.3.2 Hardware Requirements"),
    tableCaption("Table 3.2: System Hardware Requirements"),
    threeLineTable(
      ["S/N", "Hardware Component", "Specification", "Purpose"],
      [
        ["1", "Cloud Server", "Vercel Serverless Functions", "Hosts application and API routes"],
        ["2", "Database Server", "Supabase Managed PostgreSQL", "Stores and manages application data"],
        ["3", "Storage", "Supabase Storage / Cloud", "Stores media files and backups"],
        ["4", "User Device", "Smartphone or Computer", "Allows users to access the system"],
        ["5", "Network", "Internet Connection", "Provides connectivity"],
        ["6", "Input Devices", "Keyboard, mouse, touchscreen", "Enables user interaction"],
      ]
    ),

    // 3.4 System Design
    h2("3.4 System Design"),
    body("The system design translates user requirements into a structured blueprint for building the system. The HomeEase platform adopts a client-server architecture where users interact through a web application, while all processing and data management are handled by a centralized server. The system uses Next.js App Router architecture with API Routes for backend logic and React components for the frontend."),
    body("The user interface design focuses on simplicity and ease of navigation. The system provides different user views based on roles: clients (service seekers), providers (artisans), and administrators. Users can register, log in, browse available domestic services, submit service requests, schedule appointments, make payments, communicate via real-time messaging, and provide feedback."),
    body("The application logic is handled by Next.js API Routes, which process user requests, validate information, manage database operations, and handle payment processing through Paystack integration. The escrow wallet system ensures payments are held securely until service completion, then automatically credited to the provider's virtual wallet after the 5% platform commission is deducted."),
    body("The database design uses PostgreSQL with Prisma ORM, containing tables for Users, Providers, ServiceRequests, Transactions, Wallets, WalletTransactions, Messages, Notifications, Feedbacks, SupportMessages, and AdminLogs. Relationships are established using foreign keys, with proper indexing and constraints for performance and consistency."),

    // 3.4.1 Use Case Diagram
    h3("3.4.1 Use Case Diagram"),
    body("The Use Case Diagram illustrates the primary interactions between the system actors and the system itself. It highlights the essential functions required by the platform while providing a visual representation of user roles and their corresponding actions."),
    bodyNoIndent("Primary Actors: Users (individuals or households) seeking domestic services.", { beforeSpacing: 120 }),
    bodyNoIndent("Secondary Actors: Service Providers (artisans/workers) offering domestic services.", { beforeSpacing: 120 }),
    bodyNoIndent("Administrative Actor: System administrators who manage and oversee platform operations.", { beforeSpacing: 120 }),
    bodyNoIndent("Use Cases include: User Registration and Authentication, Profile Management, Service Request Submission, Messaging and Notifications, Payment Processing (with escrow wallet), Feedback and Ratings, and Administrative Oversight.", { beforeSpacing: 120 }),
    ...imgPara(`${IMG}/image7.png`, 0, 0, "Figure 3.1: Use Case Diagram", "3.1"),

    // 3.4.2 Context Diagram
    h3("3.4.2 Context Diagram"),
    body("A Context Diagram defines the scope and boundaries of the software by showing how it interacts with the outside world. The entire system is represented as a single process, and the focus is on the inputs and outputs between the system and external actors including Users, Service Providers, Administrators, and the Paystack Payment Gateway."),
    ...imgPara(`${IMG}/image8.png`, 0, 0, "Figure 3.2: Context Diagram", "3.2"),

    // 3.4.3 Document Flow Diagram
    h3("3.4.3 Document Flow Diagram"),
    body("The Document Flow Diagram illustrates how documents and information flow between different participants in the system lifecycle. The lifecycle begins with user registration, proceeds through service request submission, provider matching, service delivery, payment processing, and concludes with feedback submission."),
    ...imgPara(`${IMG}/image9.png`, 0, 0, "Figure 3.3: Document Flow Diagram", "3.3"),

    // 3.4.4 Data Flow Diagram
    h3("3.4.4 Data Flow Diagram"),
    body("A Data Flow Diagram (DFD) illustrates how data moves through the system, the processes that transform the data, the data stores where information is kept, and the external entities that interact with the system. Key processes include User Registration and Authentication, Service Request Management, Service Matching and Scheduling, Payment Processing (with escrow), Service Delivery and Feedback, and Administration and Reporting."),
    ...imgPara(`${IMG}/image10.png`, 0, 0, "Figure 3.4: Data Flow Diagram", "3.4"),

    // 3.4.5 Entity-Relationship Diagram
    h3("3.4.5 Entity-Relationship Diagram"),
    body("The Entity-Relationship Diagram (ERD) defines the entities, their attributes, and the relationships between them. The core entities include User (parent table for authentication), Provider (artisan profile with skills, rates, bank details), ServiceRequest (booking details), Transaction (payment records), Wallet (provider virtual wallet), WalletTransaction (wallet ledger entries), Message (real-time chat), Notification (system alerts), and Feedback (ratings and reviews)."),
    body("Key relationships include: User to Provider (1:1), User/Provider to ServiceRequest (1:M), ServiceRequest to Transaction (1:1), Provider to Wallet (1:1), and Wallet to WalletTransaction (1:M). These relationships ensure data integrity and proper linkage between platform components."),
    ...imgPara(`${IMG}/image11.png`, 0, 0, "Figure 3.5: Entity-Relationship Diagram", "3.5"),

    // 3.4.6 Relational Model
    h3("3.4.6 Relational Model Diagram"),
    body("The Relational Data Model details exactly how the tables are implemented in the database, including data types and key constraints. The User table contains id, email, name, phone, passwordHash, role, avatarUrl, and status. The Provider table extends the User with skills, bio, hourlyRate, rating, location, verificationStatus, completedJobs, and bank details. The Transaction table tracks requestId, clientId, providerId, amount, platformFee (5%), providerPayout, paymentMethod, status, and walletCredited flag."),
    ...imgPara(`${IMG}/image12.png`, 0, 0, "Figure 3.6: Relational Model Diagram", "3.6"),

    // 3.5 System Maintenance
    h2("3.5 System Maintenance"),
    body("Long-term system sustainability requires structured maintenance procedures including routine database maintenance (index optimization, data cleanup, and archiving), regular codebase updates (frontend and backend dependency updates and vulnerability patching), continuous monitoring and logging (server monitoring for uptime, error tracking, and performance metrics), a robust backup strategy (daily incremental and weekly full backups stored in the cloud), and scalability planning (horizontal scaling during peak demand and load balancing)."),

    // 3.6 Future Enhancements
    h2("3.6 Future Enhancements"),
    body("The platform is designed to accommodate incremental improvements including native mobile application development for iOS and Android, AI-powered matching using machine learning algorithms to predict provider suitability, location-aware services with GPS-based matching, dynamic pricing based on demand and service complexity, enhanced security with biometric authentication, expanded service categories, and a real-time analytics dashboard for administrators."),
  ];
}

// ==================== REFERENCES ====================
function buildReferences() {
  const refs = [
    "[1] Adeyemi, O. and Fatile, J. (2021). Technology Adoption in Domestic Work Management. Journal of Digital Services, 12(3), 45-62.",
    "[2] Aishwaryalakshmi, S. et al. (2024). Digital Platform for Domestic Services: Design and Implementation. International Journal of Web Technologies, 8(2), 112-128.",
    "[3] Berg, J. (2018). TaskRabbit Platform Study: Digital Marketplace for Domestic Services. Platform Economy Review, 5(1), 33-50.",
    "[4] Chatterjee, S. et al. (2021). Financial Lives of Platform Workers: Income Stability and Payment Systems. Journal of Labor Economics, 39(4), 201-230.",
    "[5] Chen, L. et al. (2021). Digital Platforms and Household Services: Opportunities and Challenges. Computers in Human Behavior, 124, 106983.",
    "[6] Davis, F. (1989). Perceived Usefulness, Perceived Ease of Use, and User Acceptance of Information Technology. MIS Quarterly, 13(3), 319-340.",
    "[7] Indravasan, D. et al. (2018). An Online System for Household Services. IEEE International Conference on Web Services, 245-252.",
    "[8] Khatri, P. and Gupta, A. (2020). Digital Platforms for Household Services. International Journal of Service Industry Management, 11(2), 78-95.",
    "[9] Meyanban, R. et al. (2024). Online Platforms and Domestic Workers: Digital Inclusion and Service Accessibility. Technology in Society, 76, 102392.",
    "[10] Orth, M. and Baum, M. (2024). Researching Digital Domestic Platforms: Methodological and Ethical Challenges. Qualitative Research, 25(3), 412-430.",
    "[11] Pais, J. and Zanoni, P. (2024). Platform-Mediated Domestic Service: Algorithmic Management and Governance. Work, Employment and Society, 38(1), 56-74.",
    "[12] Rakhewar, S. et al. (2023). Web-based Service-Providing Platform for Domestic Services. International Journal of Computer Applications, 187(5), 34-42.",
    "[13] Rana, N. et al. (2019). User Experience in Service Delivery Apps. Journal of Systems and Software, 150, 123-140.",
    "[14] Sehgal, R. and Yathrath, A. (2022). Digital Platforms and Domestic Work: Urban Company Case Study. Platform Studies, 4(2), 89-107.",
    "[15] Sundararajan, A. (2016). The Sharing Economy: The End of Employment and the Rise of Crowd-Based Capitalism. MIT Press.",
    "[16] Vallas, S. and Schor, J. (2020). What Do Platforms Do? Understanding the Gig Economy. Annual Review of Sociology, 46, 273-294.",
    "[17] Yadav, R. et al. (2023). On-Demand Home Service Platforms: User Expectations and Market Dynamics. Service Industries Journal, 43(5), 445-465.",
    "[18] Next.js Documentation (2025). Next.js 16: The React Framework for the Web. Vercel. Available at: https://nextjs.org/docs",
    "[19] Prisma Documentation (2025). Prisma: Next-Generation Node.js and TypeScript ORM. Available at: https://www.prisma.io/docs",
    "[20] Paystack Documentation (2025). Paystack: Modern Online Payments for Africa. Available at: https://paystack.com/docs",
  ];
  return [
    h1("REFERENCES"),
    ...refs.map(ref => new Paragraph({
      indent: { left: 480, hanging: 480 },
      spacing: { line: 360, after: 80 },
      children: [new TextRun({ text: ref, size: 24, font: { ascii: "Times New Roman" }, color: "000000" })],
    })),
  ];
}

// ==================== BUILD DOCUMENT ====================
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Times New Roman", eastAsia: "Times New Roman" }, size: 24, color: "000000" },
        paragraph: { spacing: { line: 360 } },
      },
      heading1: {
        run: { font: { ascii: "Times New Roman" }, size: 32, bold: true, color: "000000" },
        paragraph: { spacing: { before: 480, after: 360, line: 360 } },
      },
      heading2: {
        run: { font: { ascii: "Times New Roman" }, size: 30, bold: true, color: "000000" },
        paragraph: { spacing: { before: 360, after: 240, line: 360 } },
      },
      heading3: {
        run: { font: { ascii: "Times New Roman" }, size: 28, bold: true, color: "000000" },
        paragraph: { spacing: { before: 240, after: 120, line: 360 } },
      },
    },
  },
  sections: [
    // Section 1: Cover Page (no page number, no header/footer)
    {
      properties: {
        page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCover(),
    },
    // Section 2: Front matter (Abstract + TOC) - Roman numerals
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417, header: 850, footer: 992 },
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" } },
            children: [new TextRun({ text: "Design and Implementation of a Virtual Space for Domestic Services", size: 18, color: "333333", font: { ascii: "Times New Roman" } })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "- ", size: 21 }),
              new TextRun({ children: [PageNumber.CURRENT], size: 21 }),
              new TextRun({ text: " -", size: 21 }),
            ],
          })],
        }),
      },
      children: [...buildAbstract(), ...buildTOC()],
    },
    // Section 3: Body (Chapters 1-3 + References) - Arabic numerals from 1
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417, header: 850, footer: 992 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" } },
            children: [new TextRun({ text: "Design and Implementation of a Virtual Space for Domestic Services", size: 18, color: "333333", font: { ascii: "Times New Roman" } })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "- ", size: 21 }),
              new TextRun({ children: [PageNumber.CURRENT], size: 21 }),
              new TextRun({ text: " -", size: 21 }),
            ],
          })],
        }),
      },
      children: [
        ...buildChapter1(),
        ...buildChapter2(),
        ...buildChapter3(),
        ...buildReferences(),
      ],
    },
  ],
});

// ==================== WRITE FILE ====================
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUTPUT, buf);
  console.log("Document generated: " + OUTPUT);
}).catch(err => {
  console.error("Error:", err);
});
