import fs from 'node:fs'

const sourcePath = '/home/ubuntu/.mcp/tool-results/2026-08-18_15-06-46.988051330_supabase_get_edge_function_54dfea22.json'
const outputPath = '/home/ubuntu/trip-webapp/receipt-analysis-deploy.json'
const sourceDocument = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
const original = sourceDocument.files.find((file) => file.name === 'index.ts')?.content

if (!original) throw new Error('Unable to locate receipt-analysis index.ts source')

const updated = original
  .replace("const timeout = setTimeout(() => controller.abort(), 12_000);", "const timeout = setTimeout(() => controller.abort(), 8_000);")
  .replace('for (let attempt = 0; attempt < 3; attempt += 1)', 'for (let attempt = 0; attempt < 2; attempt += 1)')
  .replaceAll('attempt === 2', 'attempt === 1')

if (updated === original || !updated.includes('attempt < 2') || !updated.includes('8_000')) {
  throw new Error('Expected provider timeout and retry controls were not updated')
}

const payload = {
  project_id: 'skrdhktjyiiipxcuxknk',
  name: 'receipt-analysis',
  entrypoint_path: 'index.ts',
  verify_jwt: true,
  files: [{ name: 'index.ts', content: updated }],
}

fs.writeFileSync(outputPath, JSON.stringify(payload), { mode: 0o600 })
console.log(`Prepared ${outputPath}`)
