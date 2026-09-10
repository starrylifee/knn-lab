const {test}=require('node:test');
const assert=require('node:assert/strict');
const {schedule,access}=require('../lib/microbe-access');
const at=s=>Date.parse(s+'+09:00');
test('Korea weekdays: 09:00 inclusive and 14:30 exclusive',()=>{
 for(const [t,open]of [['2026-09-09T08:59:59',false],['2026-09-09T09:00:00',true],['2026-09-09T14:29:59',true],['2026-09-09T14:30:00',false],['2026-09-12T10:00:00',false],['2026-09-13T10:00:00',false]])assert.equal(schedule(at(t)).regular,open,t);
 assert.equal(schedule(at('2026-09-11T14:30:00')).nextChange,at('2026-09-14T09:00:00'));
});
test('only correct override code opens after hours',()=>{
 const now=at('2026-09-12T10:00:00');
 assert.equal(access('',now).allowed,false);assert.equal(access('wrong',now).allowed,false);
 process.env.MICROBE_ACCESS_CODE='testcode';assert.equal(access('testcode',now).allowed,true);assert.equal(access('TESTCODE',now).allowed,false);delete process.env.MICROBE_ACCESS_CODE;assert.equal(access('testcode',now).allowed,false);
});
