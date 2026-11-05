import test from 'node:test';
import assert from 'node:assert/strict';
import {eventDetails,plainDescription} from '../server/nylas.mjs';
import {calendarEventPanel,eventClients,eventTiming} from '../public/calendar-event-panel.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=n=>`[${n}]`;

test('calendar events carry guests, organizer, meeting link and a plain-text description',()=>{
 const d=eventDetails({participants:[{email:'Sophie@Juniper.example',name:'Sophie',status:'yes'},{email:'tom@gmail.com',status:'noreply'},{name:'no email'}],organizer:{email:'alex@studio.example',name:'Alex'},conferencing:{provider:'Google Meet',details:{url:'https://meet.google.com/abc-defg-hij',meeting_code:'abc-defg-hij'}},description:'<p>Agenda</p><ul><li>Logos</li></ul><a href="https://docs.example/brief">Brief</a><script>x</script>&amp; more',html_link:'https://calendar.google.com/event?eid=1',recurrence:['RRULE:FREQ=WEEKLY']});
 assert.deepEqual(d.guests,[{name:'Sophie',email:'sophie@juniper.example',status:'accepted'},{name:'',email:'tom@gmail.com',status:'pending'}]);
 assert.deepEqual(d.meeting,{url:'https://meet.google.com/abc-defg-hij',provider:'Google Meet',code:'abc-defg-hij'});
 assert.equal(d.calendarUrl,'https://calendar.google.com/event?eid=1');assert.equal(d.recurring,true);
 assert.match(d.description,/^Agenda\n• Logos\nBrief \(https:\/\/docs\.example\/brief\)x& more$/);
 assert.doesNotMatch(d.description,/</);
});
test('meeting links are found in the location or description, and only https links are kept',()=>{
 assert.equal(eventDetails({location:'Zoom https://us02web.zoom.us/j/123?pwd=x'}).meeting.provider,'Zoom');
 assert.equal(eventDetails({description:'Join: https://teams.microsoft.com/l/meetup-join/abc'}).meeting.provider,'Microsoft Teams');
 assert.equal(eventDetails({conferencing:{details:{url:'javascript:alert(1)'}},html_link:'http://calendar.example'}).meeting,null);
 assert.equal(eventDetails({html_link:'http://calendar.example'}).calendarUrl,'');
 assert.equal(plainDescription('a'.repeat(6000)).length,5000);
});
test('guests match clients by email, or by company domain but never by free email domains',()=>{
 const state={clients:[{id:'c1',name:'Juniper',email:'sophie@juniper.example'},{id:'c2',name:'Solo',email:'solo@gmail.com'},{id:'c3',name:'Old',email:'x@old.example',archived:true}]};
 const ids=entry=>eventClients(state,entry).map(c=>c.id);
 assert.deepEqual(ids({guests:[{email:'mark@juniper.example'}]}),['c1']);
 assert.deepEqual(ids({guests:[{email:'someone@gmail.com'}]}),[]);
 assert.deepEqual(ids({guests:[{email:'solo@gmail.com'}]}),['c2']);
 assert.deepEqual(ids({guests:[{email:'x@old.example'}]}),[]);
});
test('the event drawer shows actions, details, guests and an escaped description',()=>{
 const entry={title:'Review',allDay:false,start:'2026-11-05T10:30:00Z',end:'2026-11-05T11:15:00Z',meeting:{url:'https://meet.google.com/abc',provider:'Google Meet',code:''},organizer:{name:'Alex',email:'alex@studio.example'},guests:[{name:'Sophie',email:'sophie@juniper.example',status:'accepted'},{name:'',email:'tom@gmail.com',status:'declined'}],calendarUrl:'https://calendar.google.com/e',description:'<b>Hi</b> see https://docs.example/x'};
 const html=calendarEventPanel(entry,{state:{clients:[{id:'c1',name:'Juniper',email:'sophie@juniper.example'}]},icon,esc,account:'alex@studio.example'});
 for(const s of ['Join Google Meet','Open in calendar','45 min','data-action="client" data-id="c1"','Guests <span class="count">3</span>','1 declined','Organizer','&lt;b&gt;Hi&lt;/b&gt;','href="https://docs.example/x"'])assert.ok(html.includes(s),s);
 assert.equal(eventTiming({allDay:true,start:'2026-11-05'}).duration,'');
 assert.ok(!calendarEventPanel({title:'x',allDay:true,start:'2026-11-05',guests:[]},{state:{},icon,esc}).includes('Guests'));
});
