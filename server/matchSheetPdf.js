import { readFile } from 'node:fs/promises';
import { playerParticipation,formatPlayingTime,eventDescription,eventLabels,eventMinute,orderedEvents,MATCH_SHEET_CLUB_NAME, matchPresentation,validateSheet } from '../src/features/match-sheet/model.js';

// Small A4 writer using PDF's standard WinAnsi Helvetica fonts. No browser or remote image fetch.
const winAnsi={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159,'′':39};
function literal(value){return [...String(value??'').normalize('NFC')].map(c=>c.charCodeAt(0)<256?c:winAnsi[c]?String.fromCharCode(winAnsi[c]):'?').join('').replace(/[\x00-\x1f\x7f]/g,' ').replace(/[\\()]/g,'\\$&');}
function wrap(value,max){
  const lines=[];for(const paragraph of String(value??'').split(/\r?\n/)){let line='';for(const word of paragraph.split(/\s+/)){if(!word)continue;let rest=word;while(rest.length>max){if(line){lines.push(line);line='';}lines.push(rest.slice(0,max));rest=rest.slice(max);}if((line+' '+rest).trim().length>max){lines.push(line);line=rest;}else line=(line+' '+rest).trim();}lines.push(line);}return lines;
}
function jpegSize(buffer){let p=2;while(p<buffer.length){if(buffer[p]!==255)throw new Error('Invalid report logo');const marker=buffer[p+1],length=buffer.readUInt16BE(p+2);if([192,193,194].includes(marker))return {height:buffer.readUInt16BE(p+5),width:buffer.readUInt16BE(p+7)};p+=length+2;}throw new Error('Invalid report logo');}
export async function makeMatchSheetPdf(sheet,revision){
  const issue=validateSheet(sheet);if(issue)throw new Error(issue);
  const jpg=await readFile(new URL('./assets/match-sheet-logo.jpg',import.meta.url));const size=jpegSize(jpg);
  const pages=[];let ops=[],y=0;
  const text=(value,x,top,font=10,bold=false)=>ops.push(`BT /${bold?'F2':'F1'} ${font} Tf 1 0 0 1 ${x} ${842-top} Tm (${literal(value)}) Tj ET`);
  function newPage(){if(ops.length)pages.push(ops.join('\n'));ops=[];ops.push('0.08 0.08 0.08 rg');ops.push('q 43 0 0 50 42 748 cm /Logo Do Q');text(MATCH_SHEET_CLUB_NAME,100,60,18,true);text(`Ficha interna de jogo · ${sheet.ageGroup} · ${sheet.season}`,100,79,10);text(`${sheet.status==='finished'?'Finalizada':'Rascunho'} · versão ${revision}`,100,96,9);ops.push('0.8 G 42 733 m 553 733 l S');y=129;}
  function space(height){if(y+height>775)newPage();}
  function paragraph(value,{font=10,bold=false,indent=0}={}){const max=Math.max(20,Math.floor((511-indent)/(font*.58)));for(const line of wrap(value,max)){space(font+6);text(line,42+indent,y,font,bold);y+=font+5;}y+=3;}
  function heading(value){space(52);y+=8;paragraph(value,{font:12,bold:true});}
  function table(headers,rows,widths){
    const row=(values,header=false)=>{const cells=values.map((v,i)=>wrap(v,Math.floor((widths[i]-14)/5.8)));const h=Math.max(...cells.map(c=>c.length))*12+10;
      if(y+h>765){newPage();if(!header)row(headers,true);}
      if(header)ops.push(`0.94 0.95 0.93 rg 42 ${842-y-h+9} 511 ${h} re f 0.08 0.08 0.08 rg`);
      let x=42;cells.forEach((lines,i)=>{lines.forEach((line,n)=>text(line,x+7,y+3+n*12,10,header));x+=widths[i];});y+=h;ops.push(`0.85 G 42 ${842-y+7} m 553 ${842-y+7} l S`);
    };row(headers,true);rows.forEach(r=>row(r));y+=8;
  }
  const result=matchPresentation(sheet);
  newPage();paragraph(result.title,{font:15,bold:true});
  paragraph(`${sheet.date.split('-').reverse().join('/')} · ${sheet.time||'Hora por indicar'} · ${sheet.home?'Casa':'Fora'} · ${sheet.venue||'Local por indicar'}`);
  paragraph(`${sheet.competition||'Jogo particular'} · Futebol ${sheet.rules.fieldSize} · ${sheet.rules.periods} × ${sheet.rules.periodMinutes} minutos`);
  paragraph(`Responsável: ${sheet.recorder}`);
  paragraph(`Resultado: ${result.result}`,{font:13,bold:true});
  const participation=playerParticipation(sheet);
  heading('Convocatória e minutos');table(['N.º','Jogador','Condição','Minutos'],sheet.squad.map(p=>[p.shirt_number??'—',p.name+(p.captain?' (C)':''),p.starter?'Titular':'Suplente',formatPlayingTime(participation.players.find(row=>row.id===p.id)?.elapsedMs||0)]),[40,271,110,90]);
  paragraph('Minutos calculados pelos registos, incluindo acréscimos e reentradas; excluem o intervalo.'+(participation.estimated?' Estimativa: faltam durações de períodos ou o relógio não acompanha os eventos.':''),{font:9});
  heading('Eventos do jogo');if(sheet.events.length)table(['Minuto','Evento','Detalhe'],orderedEvents(sheet).map(e=>[`${eventMinute(e)} · ${e.period}.º P`,eventLabels[e.kind],eventDescription(sheet,e)]),[85,126,300]);else paragraph('Sem eventos registados.');
  heading('Observações');paragraph(sheet.notes||'Sem observações.');
  if(ops.length)pages.push(ops.join('\n'));
  const objects=[null];const add=value=>{objects.push(Buffer.isBuffer(value)?value:Buffer.from(value,'latin1'));return objects.length-1;};
  add('<< /Type /Catalog /Pages 2 0 R >>');add('');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${size.width} /Height ${size.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`),jpg,Buffer.from('\nendstream')]));
  const pageIds=[];
  pages.forEach((content,index)=>{
    const footer=`\nBT /F1 8 Tf 1 0 0 1 42 34 Tm (Ficha interna · ${literal(sheet.id)} · v${revision}) Tj ET\nBT /F1 8 Tf 1 0 0 1 500 34 Tm (${index+1} / ${pages.length}) Tj ET\nBT /F1 8 Tf 1 0 0 1 42 23 Tm (N\xe3o substitui a ficha oficial da competi\xe7\xe3o.) Tj ET`;
    const stream=Buffer.from(content+footer,'latin1');const contentId=add(Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`),stream,Buffer.from('\nendstream')]));
    pageIds.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Logo 5 0 R >> >> /Contents ${contentId} 0 R >>`));
  });
  objects[2]=Buffer.from(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] >>`);
  const chunks=[Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n','latin1')],offsets=[0];let length=chunks[0].length;
  objects.slice(1).forEach((object,i)=>{offsets.push(length);const chunk=Buffer.concat([Buffer.from(`${i+1} 0 obj\n`),object,Buffer.from('\nendobj\n')]);chunks.push(chunk);length+=chunk.length;});
  const xref=`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`;
  chunks.push(Buffer.from(xref));return Buffer.concat(chunks);
}
