import fs from 'fs';
import path from 'path';

// Define paths
const REEX_DOCS_DIR = path.resolve(__dirname, '../../../reex-docs/app');
const OUTPUT_FILE = path.resolve(__dirname, '../data/docs-context.txt');

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to recursively get all MDX files
function getMdxFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    console.warn(`Directory not found: ${dir}`);
    return fileList;
  }
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getMdxFiles(filePath, fileList);
    } else if (file.endsWith('.mdx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// Function to clean MDX content
function cleanMdx(content: string): string {
  // 1. Remove import statements
  let cleaned = content.replace(/^import\s+.*?;\s*$/gm, '');
  
  // 2. Remove frontmatter (if any)
  cleaned = cleaned.replace(/^---[\s\S]*?---/g, '');
  
  // 3. Remove standard JSX tags (like <Tabs>, <Tabs.Tab>, <Callout>, etc.) but try to keep text inside if possible, 
  // or just strip the tags. For complex nested tags, simple regex is imperfect, but good enough for context.
  // This removes <Tag> and </Tag> but leaves the inner content.
  cleaned = cleaned.replace(/<\/?([A-Za-z0-9\.]+)(?:\s+[^>]+)?>/g, '');
  
  // 4. Remove MDX specific exports
  cleaned = cleaned.replace(/^export\s+.*$/gm, '');

  // 5. Clean up lines that only contain whitespace (leftover from indented tags)
  cleaned = cleaned.replace(/^[ \t]+$/gm, '');

  // 6. Clean up extra newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

// Main execution
function buildDocsContext() {
  console.log(`Searching for MDX files in: ${REEX_DOCS_DIR}`);
  const mdxFiles = getMdxFiles(REEX_DOCS_DIR);
  
  if (mdxFiles.length === 0) {
    console.error('No MDX files found.');
    return;
  }
  
  console.log(`Found ${mdxFiles.length} MDX files. Processing...`);
  
  let combinedDocs = '';
  
  for (const filePath of mdxFiles) {
    // Generate a readable section title based on the relative path
    const relativePath = path.relative(REEX_DOCS_DIR, filePath);
    const pathParts = relativePath.split(path.sep);
    
    // Create section name (e.g., "Project Module > Getting Started")
    let sectionName = 'Introduction & Philosophy';
    if (pathParts.length > 1 || (pathParts.length === 1 && pathParts[0] !== 'page.mdx')) {
       // Filter out 'page.mdx' to just get folder names
       const cleanParts = pathParts.filter(p => p !== 'page.mdx');
       if (cleanParts.length > 0) {
           sectionName = cleanParts
              .map(part => part.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
              .join(' > ');
       }
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const cleanedContent = cleanMdx(content);
    
    combinedDocs += `## ${sectionName}\n---\n${cleanedContent}\n\n`;
  }
  
  fs.writeFileSync(OUTPUT_FILE, combinedDocs);
  console.log(`Docs context successfully written to ${OUTPUT_FILE} (${Math.round(fs.statSync(OUTPUT_FILE).size / 1024)}KB)`);
}

buildDocsContext();
