---
Task ID: 1
Agent: Main Agent
Task: Restructure HomeEase thesis writeup - proper numbering, bullet-to-number conversion, inline references, ordered references

Work Log:
- Analyzed the original "new mariam.docx" (674 paragraphs, 3 tables, 12 images) to understand document structure
- Identified heading numbering issues: Chapter 1 used D/E/F/G instead of 1.0/1.1/etc.
- Identified Chapter 2 numbering: 2.2.1→2.2.2 (should be 2.2, 2.3, etc.)
- Identified Chapter 3 numbering bugs: 3.6.2 should be 3.3.2, duplicate 3.5.3
- Identified 18 bullet/list paragraphs needing number conversion
- Built comprehensive Python script (upload/final_update.py) that:
  1. Updates tech stack (Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Prisma, SQLite, Paystack, Vercel)
  2. Fixes heading numbering (1.0, 1.1, 1.2... for Ch1; 2.0, 2.1, 2.2... for Ch2; 3.0, 3.1... for Ch3)
  3. Converts all bullets to numbered lists (i, ii, iii, iv, v, vi, vii)
  4. Adds 93 inline citations using author-year format
  5. Generates 60 unique references (all 2020+) ordered by FIRST APPEARANCE in text
  6. Handles et al. aliases (Salah et al., Wang et al., Silberschatz et al., Teorey et al.)
- Cross-check verification: every citation has a matching reference, every reference is cited inline
- Updated download API endpoint to include 'final' file option

Stage Summary:
- Output file: upload/HomeEase_Final_Writeup.docx (2.53 MB, 736 paragraphs, 3 tables)
- All images, tables, and formatting preserved from original
- First citation (ILO, 2022) now matches first reference (ILO. 2022...)
- References ordered by first appearance: ILO → Hoskins & Munsell → Schweninger → ... → Tilley
