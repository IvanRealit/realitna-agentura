import internals from '@prisma/internals';
const { getGenerators } = internals;
// Prisma's official generator uses WASM for schema parsing. The runtime uses
// the stable JS query compiler + pg adapter; no native query engine is needed.
const generators=await getGenerators({schemaPath:'prisma/schema.prisma',skipDownload:true,registry:{'prisma-client-js':{type:'rpc',generatorPath:new URL('../node_modules/@prisma/client/generator-build/index.js',import.meta.url).pathname,isNode:true}}});
try{for(const generator of generators)await generator.generate();}finally{for(const generator of generators)generator.stop();}
