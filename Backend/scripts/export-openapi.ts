import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { openapiDocument } from '../src/config/openapi';

const docsDir = resolve(process.cwd(), '..', 'docs');
mkdirSync(docsDir, { recursive: true });

const target = resolve(docsDir, 'openapi.json');
writeFileSync(target, `${JSON.stringify(openapiDocument, null, 2)}\n`, 'utf8');

console.log(`OpenAPI exportado a ${target}`);
