// Retained entry point for existing local-preview commands.
process.argv=[process.argv[0],process.argv[1],'dev','--port','4173','--hostname','127.0.0.1'];
await import('./scripts/run-framework.mjs');
