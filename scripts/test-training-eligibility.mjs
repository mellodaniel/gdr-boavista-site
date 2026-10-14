import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
const asModule = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpile(source, {target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext})).toString('base64');
const schedulesUrl = asModule(readFileSync('src/lib/trainingSchedules.ts','utf8'));
const source = readFileSync('src/lib/trainingEligibility.ts','utf8').replace("'./trainingSchedules'",JSON.stringify(schedulesUrl));
const {findTrainingGroup} = await import(asModule(source));
const expected = new Map([[2007,'Seniores'],[2008,'Juniores'],[2009,'Juniores'],[2010,'Juvenis'],[2011,'Juvenis'],[2012,'Iniciados'],[2013,'Iniciados'],[2014,'Infantis · Sub-13'],[2015,'Infantis · Sub-12'],[2016,'Benjamins'],[2017,'Benjamins'],[2018,'Traquinas'],[2019,'Traquinas'],[2020,'Petizes'],[2021,'Petizes'],[2022,'Primeiros passos'],[2026,'Primeiros passos']]);
for(const [year, label] of expected){
 const result=findTrainingGroup(String(year),2026);
 assert.ok(result.label.startsWith(label),`${year}: ${result.label}`);
 assert.ok(result.schedules.every(s=>s && s.sessions.length && s.sessions.every(t=>t.days.length && t.time)));
}
for(const value of ['', 'abc','20a4','2014.5','-2014','0','0000','1925','2027','Infinity']) assert.equal(findTrainingGroup(value,2026),null,value);
assert.equal(findTrainingGroup('2014',2026).schedules[0].sessions[0].time,'18h45 — 19h45');
for(const year of ['2010','2011','2016','2017','2018','2019']) assert.equal(findTrainingGroup(year,2026).needsTeamConfirmation,true);
assert.match(findTrainingGroup('2022',2026).note,/confirmação/);
assert.equal(findTrainingGroup('2014',2027).label,'Infantis · Sub-13','Season must not silently roll forward');
console.log('Escalões: 18 anos de referência, limites, entradas inválidas, horários e equipas A/B validados.');
