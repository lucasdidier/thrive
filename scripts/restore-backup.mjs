// Checks a nightly backup, and restores it into an empty Supabase project (docs/launch.md › 5).
//
//   Check only (reads the file, changes nothing):
//     node scripts/restore-backup.mjs ~/Downloads/thrive-backup.json.gz
//   Restore into an empty project that has every file in supabase/migrations applied:
//     THRIVE_RESTORE_SECRET_KEY=sb_secret_… node scripts/restore-backup.mjs ~/Downloads/thrive-backup.json.gz \
//       --target https://PROJECT-REF.supabase.co --execute [--files ~/Downloads/thrive-files]
//
// The secret key has its own variable name so a production key already in your shell is never picked up.
// It refuses the project the backup came from (add --into-source only for real disaster recovery) and any
// project whose Thrive tables already hold rows.
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {homedir} from 'node:os';
import {createClient} from '@supabase/supabase-js';
import {readBackup,checkBackup,nonEmptyTables,restoreBackup,verifyRestore,SKIPPED} from '../server/restore.mjs';

const args=process.argv.slice(2),flag=name=>args.includes(name),option=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined;};
const expand=p=>p?.startsWith('~')?homedir()+p.slice(1):p;
const file=expand(args.find((a,i)=>!a.startsWith('--')&&!['--target','--files'].includes(args[i-1])));
const stop=message=>{console.error('\n'+message);process.exit(1);};
if(!file)stop('Give the backup file: node scripts/restore-backup.mjs ~/Downloads/thrive-backup.json.gz');

const data=await readBackup(await readFile(file)).catch(e=>stop(e.message));
const summary=await checkBackup(data);
console.log(`Backup from ${summary.createdAt}, taken from ${summary.source}`);
console.log(`Accounts: ${summary.accounts}`);
for(const [t,n] of Object.entries(summary.counts))console.log(`  thrive_${t}: ${n}${SKIPPED.includes(t)?' (not restored: one-time states)':''}`);
if(summary.notInBackup.length)console.log(`Not in this backup (older format): ${summary.notInBackup.map(t=>'thrive_'+t).join(', ')}`);
console.log(`Workspaces that decode: ${summary.workspaces} of ${summary.counts.workspaces||0}`);
if(summary.problems.length)stop('Problems:\n  '+summary.problems.join('\n  '));
console.log('The backup file is readable and complete.');
if(!flag('--execute')){console.log('\nNothing was written. Add --target and --execute to restore it into an empty project.');process.exit(0);}

const target=option('--target'),key=process.env.THRIVE_RESTORE_SECRET_KEY;
if(!target||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(target))stop('Give the empty project to restore into: --target https://PROJECT-REF.supabase.co');
if(!key)stop('Set THRIVE_RESTORE_SECRET_KEY to the target project\'s secret key (Settings › API Keys).');
const same=new URL(target).host===new URL(summary.source||'https://none.invalid').host;
if(same&&!flag('--into-source'))stop(`${target} is the project this backup came from. Restore into a separate, empty project to test. For real disaster recovery into the same project, add --into-source.`);
const admin=createClient(target.replace(/\/$/,''),key,{auth:{persistSession:false,autoRefreshToken:false}});
const busy=await nonEmptyTables(admin).catch(e=>stop(e.message));
if(busy.length)stop('The target project is not empty, so nothing was restored:\n  '+busy.join('\n  '));

const filesDir=option('--files')&&resolve(expand(option('--files')));
const readUpload=filesDir&&(async key=>{const path=resolve(filesDir,key);if(!path.startsWith(filesDir+sep))return null;try{return await readFile(path);}catch{return null;}});
console.log(`\nRestoring into ${target}…`);
const report=await restoreBackup(data,{admin,readFile:readUpload,log:line=>console.log('  '+line)}).catch(e=>stop('Restore stopped: '+e.message+'\nThe target is partly filled. Delete the project (or reset it and rerun the migrations) before trying again.'));
const differences=await verifyRestore(data,admin);
if(differences.length)stop('Restored, but the target does not match the backup:\n  '+differences.join('\n  '));
console.log(`\nRestore verified: ${report.accounts.created+report.accounts.existing} accounts and every table match the backup.`);
if(!filesDir&&summary.counts.form_uploads)console.log('Form uploads were not restored (no --files folder). Their records are in place.');
console.log('Connected email and calendar accounts only work again with the same encryption keys and provider apps as the source. Otherwise people reconnect them.');
