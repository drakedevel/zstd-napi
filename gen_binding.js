import { createRequire } from 'module';

const binding = createRequire(import.meta.url)('./build/Release/binding.node');

console.log(`import {createRequire} from 'module';
const buildType = process.config.target_defaults
  ? process.config.target_defaults.default_configuration
  : /* istanbul ignore next */ 'Release';
const binding = createRequire(import.meta.url)(\`./build/\${buildType}/binding.node\`);`);
for (const name of Object.getOwnPropertyNames(binding).sort()) {
  console.log(`export const ${name} = binding.${name};`);
}
