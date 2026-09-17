import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { examples, premadeExamples } from "../src/lib/sheet/examples";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Ready to print");
}
async function render(page: Page, character: unknown) {
  await page.getByRole("textbox", { name: "Character JSON" }).fill(JSON.stringify(character, null, 2));
  await page.getByRole("button", { name: "Render character sheet" }).click();
  await expect(page.locator('.measurement-frame')).toHaveCount(0);
  await expect(page.locator('.error-box')).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Ready to print");
}
function sheet(page: Page) { return page.frameLocator('iframe[title="Printable character sheet"]'); }

async function checkGeometry(page: Page) {
  const problems = await sheet(page).locator('.sheet-page').evaluateAll(pages => pages.flatMap((page,index) => {
    const area = page.querySelector('.sheet-panels') ?? page.querySelector('.card-grid')!;
    const boundary=area.getBoundingClientRect();
    const boxes=Array.from(area.children).map(box=>box.getBoundingClientRect());
    const errors:string[]=[];
    boxes.forEach((box,i)=>{
      if(box.top < boundary.top-1 || box.bottom>boundary.bottom+1 || box.left<boundary.left-1 || box.right>boundary.right+1) errors.push(`Page ${index+1}, box ${i}: overflow`);
      boxes.slice(i+1).forEach(other=>{if(Math.min(box.right,other.right)-Math.max(box.left,other.left)>1 && Math.min(box.bottom,other.bottom)-Math.max(box.top,other.top)>1)errors.push(`Page ${index+1}: overlap`);});
    });
    return errors;
  }));
  expect(problems).toEqual([]);
}

test('blank names and clean printed pages',async({page})=>{
  await ready(page);
  await expect(sheet(page).locator('.name-line')).toHaveText('');
  await expect(sheet(page).locator('body')).not.toContainText('Mira Thornwood');
  await expect(sheet(page).locator('body')).not.toContainText('Character record');
  await expect(sheet(page).locator('body')).not.toContainText('D&D 5e');
  await expect(sheet(page).locator('button, input, textarea, script')).toHaveCount(0);
  await checkGeometry(page);
});

test('invalid JSON preserves the preview and disables stale exports',async({page})=>{
  await ready(page);
  await page.getByRole('textbox',{name:'Character JSON'}).fill('{"name":');
  await page.getByRole('button',{name:'Render character sheet'}).click();
  await expect(page.locator('.error-box')).toContainText('Invalid JSON');
  await expect(page.getByRole('button',{name:'Print / PDF'})).toBeDisabled();
  await expect(sheet(page).getByText('Ranger · 3',{exact:true})).toBeVisible();
  await render(page,{version:1,name:'',system:'generic'});
});

test('schema reports invalid resource amounts',async({page})=>{
  await ready(page);
  await page.getByRole('textbox',{name:'Character JSON'}).fill(JSON.stringify({version:1,system:'generic',resources:[{name:'Ki',maximum:3,used:4}]}));
  await page.getByRole('button',{name:'Render character sheet'}).click();
  await expect(page.locator('.error-box')).toContainText('resources.0.used');
});

for(const paper of ['a4','letter'] as const) {
  test(`all corrected premades retain core stats and resources on page one (${paper})`,async({page})=>{
    await ready(page);
    for(const example of premadeExamples) {
      await render(page,{...example.character,paper});
      const first=sheet(page).locator('.sheet-page').first();
      for(const title of ['Attributes','Saving throws','Skills','Combat','Hit points','Attacks','Abilities','Features & traits']) await expect(first.getByRole('heading',{name:title,exact:true})).toHaveCount(1);
      if(example.character.resources.length || example.character.spellcasting?.slots.length) await expect(first.getByRole('heading',{name:'Resources',exact:true})).toHaveCount(1);
      if(example.character.spellcasting) {
        await expect(first.getByRole('heading',{name:'Spellcasting',exact:true})).toHaveCount(1);
        await expect(first.getByRole('heading',{name:'Spells',exact:true})).toHaveCount(1);
      }
      const equipment=sheet(page).locator('.panel').filter({has:sheet(page).getByRole('heading',{name:'Equipment',exact:true})});
      await expect(equipment).toHaveAttribute('data-actual-width','1');
      await expect(sheet(page).locator('.panel').filter({hasText:/Beginner|Easy turn/})).toHaveCount(0);
      await expect(sheet(page).locator('.continued,.card-owner,.card-page-header')).toHaveCount(0);
      await expect(sheet(page).getByRole('heading',{name:/^(Ideal|Quirk|Flaw|Notes|Death saves)$/})).toHaveCount(0);
      await checkGeometry(page);
      if (['level-3-druid-moon','level-3-paladin-devotion'].includes(example.id)) await expect(first.getByRole('heading',{name:'Equipment',exact:true})).toHaveCount(1);
      const heights=await sheet(page).locator('.reference-card').evaluateAll(cards=>cards.map(c=>c.getBoundingClientRect().height));
      for(const height of heights) expect(height).toBeCloseTo(110*96/25.4,0);
      const cardOverflow=await sheet(page).locator('.card-content').evaluateAll(cards=>cards.some(c=>c.scrollHeight>c.clientHeight+1 || c.scrollWidth>c.clientWidth+1));
      expect(cardOverflow).toBe(false);
      const widths=await sheet(page).locator('.reference-card').evaluateAll(cards=>cards.map(c=>c.getBoundingClientRect().width));
      for(const width of widths) expect(width).toBeCloseTo(88*96/25.4,0);
    }
  });
}

test('corrected numerical data matches the supplied revision',()=>{
  const ranger=premadeExamples.find(e=>e.id==='level-3-ranger-hunter')!.character;
  expect(ranger.attributes.find(a=>a.label==='Intelligence')?.value).toBe(8);
  expect(ranger.skills.find(s=>s.name==='Investigation')?.bonus).toBe('+1');
  const paladin=premadeExamples.find(e=>e.id==='level-3-paladin-devotion')!.character;
  expect(paladin.attributes.map(a=>a.value)).toEqual([8,17,14,8,11,15]);
  expect(paladin.savingThrows.slice(4).map(s=>s.bonus)).toEqual(['+2','+4']);
  expect(paladin.resources.find(r=>r.name==='Divine Sense')?.maximum).toBe(3);
  expect(paladin.spellcasting?.saveDC).toBe(12);
  expect(paladin.spellcasting?.attackBonus).toBe('+4');
  expect(paladin.spellcasting?.spells.find(s=>s.name==='Cure Wounds')?.description).toContain('1d8 + 2');
  expect(paladin.spellcasting?.spells.some(s=>s.name==='Command')).toBe(false);
  expect(paladin.equipment).toContain('Scale mail');
});

test('Wild Shape has three form cards and ritual casting stays compact',async({page})=>{
  await ready(page);
  await render(page,premadeExamples.find(e=>e.id==='level-3-druid-moon')!.character);
  for (const form of ['Brown Bear','Dire Wolf','Giant Spider']) {
    const card=sheet(page).locator('.reference-card').filter({has:sheet(page).getByRole('heading',{name:`Wild Shape: ${form}`,exact:true})});
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('1 Wild Shape use');
  }
  const ritual=sheet(page).locator('.reference-card').filter({has:sheet(page).getByRole('heading',{name:'Speak with Animals',exact:true})});
  await expect(ritual).toContainText('Action / Ritual (+10 min)');
  await expect(ritual).toContainText('Ritual: 0 slots');
  await render(page,premadeExamples.find(e=>e.id==='level-3-paladin-devotion')!.character);
  const channel=sheet(page).locator('.reference-card').filter({has:sheet(page).getByRole('heading',{name:'Channel Divinity',exact:true})});
  await expect(channel).toHaveCount(1);
  await expect(channel.getByRole('heading',{name:'Sacred Weapon',exact:true})).toHaveCount(1);
  await expect(channel.getByRole('heading',{name:'Turn the Unholy',exact:true})).toHaveCount(1);
  await expect(channel).toContainText('+7 to hit');
});

test('mixed types share a cutting page and resource frequencies are prominent',async({page})=>{
  await ready(page);
  await render(page,{version:1,name:'Never print this name',system:'generic',features:[{name:'Daily power',kind:'ability',presentation:'card',usage:{amount:1,resource:'Daily power use',frequency:'Once per day',recovery:'Dawn'}},{name:'Spell power',kind:'spell',presentation:'card',usage:{amount:2,resource:'Focus points'}}]});
  await expect(sheet(page).locator('.card-page')).toHaveCount(1);
  await expect(sheet(page).locator('.card-kind')).toHaveText(['ability','spell']);
  await expect(sheet(page).locator('.card-usage').first()).toContainText('Once per day');
  await expect(sheet(page).locator('.card-usage').last()).toContainText('2 Focus points');
  await expect(sheet(page).locator('.card-page')).not.toContainText('Never print this name');
  await expect(sheet(page).locator('.card-page')).not.toContainText('Cut along');
  await expect(sheet(page).locator('.card-page')).not.toContainText('100%');
  await checkGeometry(page);
});

test('boxes move whole, retain blank height, and can span two columns',async({page})=>{
  await ready(page);
  await render(page,{version:1,system:'generic',sections:Array.from({length:6},(_,i)=>({title:`Box ${i}`,width:2,blankLines:20,entries:[{name:`Entry ${i}`,description:'Keep every box intact.'}]})),personality:[{label:'Ideal',blankLines:6},{label:'Flaw',text:'',blankLines:2}]});
  for(let i=0;i<6;i++) {
    const box=sheet(page).locator('.panel').filter({has:sheet(page).getByRole('heading',{name:`Box ${i}`,exact:true})});
    await expect(box).toHaveCount(1);
    await expect(box).toHaveAttribute('data-actual-width','2');
    await expect(box.locator('.write-line')).toHaveCount(20);
  }
  const ideal=sheet(page).locator('.panel').filter({has:sheet(page).getByRole('heading',{name:'Ideal',exact:true})});
  await expect(ideal.locator('.write-line')).toHaveCount(6);
  await expect(ideal.locator('.prose')).toHaveCount(0);
  await checkGeometry(page);
});

test('impossibly large boxes and cards give errors instead of splitting or clipping',async({page})=>{
  await ready(page);
  for(const data of [
    {version:1,system:'generic',notes:'word '.repeat(3900)},
    {version:1,system:'generic',features:[{name:'Too much',presentation:'card',description:'word '.repeat(1500)}]},
  ]) {
    await page.getByRole('textbox',{name:'Character JSON'}).fill(JSON.stringify(data));
    await page.getByRole('button',{name:'Render character sheet'}).click();
    await expect(page.locator('.error-box')).toContainText(/larger than a full page|too tall for a single-width card/);
    await expect(page.getByRole('button',{name:'Print / PDF'})).toBeDisabled();
  }
});

test('standalone Letter export escapes text and retains cards without scripts',async({page,browser})=>{
  await ready(page);
  const attack='<script>alert(1)</script>';
  await render(page,{version:1,system:'generic',paper:'letter',features:[{name:attack,presentation:'card',description:'Literal <b>text</b>',usage:{resource:'Focus',amount:1}}]});
  const event=page.waitForEvent('download');
  await page.getByRole('button',{name:'HTML',exact:true}).last().click();
  const html=await readFile((await (await event).path())!,'utf8');
  expect(html).not.toMatch(/<script[\s>]|<template/i);
  const offline=await browser.newPage();
  await offline.context().setOffline(true);
  await offline.setContent(html);
  await expect(offline.getByRole('heading',{name:attack})).toHaveCount(1);
  expect(await offline.locator('.sheet-page').first().evaluate(el=>el.getBoundingClientRect().width)).toBeCloseTo(816,0);
  await offline.pdf({path:'test-results/mixed-letter.pdf',preferCSSPageSize:true});
  await offline.close();
});

test('legacy examples and mobile layout remain usable',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await ready(page);
  for(const example of examples.slice(0,4)) await render(page,example.character);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)).toBe(false);
});


test('packing reuses main-page space and uses uniform cards on two cutting pages',async({page})=>{
  await ready(page);
  await render(page,{version:1,system:'generic',equipment:['Rope','Lantern'],notesBlankLines:4,personality:[{label:'Ideal',blankLines:2}],features:Array.from({length:6},(_,i)=>({name:`Compact card ${i}`,presentation:'card',kind:i%2?'spell':'ability',description:'A short effect.',usage:{amount:0,resource:'None'}}))});
  await expect(sheet(page).locator('.sheet-page:not(.card-page)')).toHaveCount(1);
  await expect(sheet(page).locator('.card-page')).toHaveCount(2);
  await expect(sheet(page).locator('.reference-card')).toHaveCount(6);
  const first=sheet(page).locator('.sheet-page').first();
  await expect(first.getByRole('heading',{name:'Equipment',exact:true})).toHaveCount(1);
  await expect(first.getByRole('heading',{name:'Notes',exact:true})).toHaveCount(1);
  await checkGeometry(page);
});

test('general layout keeps related stats adjacent and blank space explicit',async({page})=>{
  await ready(page);
  await render(page,{version:1,system:'generic',hitPoints:{maximum:12},resources:[{name:'Focus',maximum:3}],attacks:[{name:'Staff',bonus:'+2',damage:'1d6'}],spellcasting:{ability:'Mind',saveDC:12,attackBonus:'+2'},personality:[{label:'Omitted empty box'},{label:'Handwriting',blankLines:3}],sections:[{title:'Omitted section'},{title:'Journal',blankLines:4,width:2,allowedWidths:[1,2],priority:70,group:'journal'},{title:'Clues',entries:[{name:'Map',description:'Follow the river.'}],allowedWidths:[1,2],group:'journal'}]});
  await expect(sheet(page).getByRole('heading',{name:/^(Notes|Omitted empty box|Omitted section)$/})).toHaveCount(0);
  await expect(sheet(page).getByRole('heading',{name:'Handwriting'})).toHaveCount(1);
  for(const [group,titles] of [['vitality',['Hit points','Resources']],['offense',['Attacks','Spellcasting']],['journal',['Journal','Clues']]] as const){
    const unit=sheet(page).locator(`.layout-group[data-group="${group}"]`);
    await expect(unit).toHaveCount(1);
    await expect(unit.locator('h2')).toHaveText([...titles]);
    const geometry=await unit.locator('.panel').evaluateAll(boxes=>boxes.map(b=>{const r=b.getBoundingClientRect();return {left:r.left,top:r.top,bottom:r.bottom};}));
    expect(geometry[1].left).toBeCloseTo(geometry[0].left,0);
    expect(geometry[1].top-geometry[0].bottom).toBeCloseTo(3*96/25.4,0);
  }
  await checkGeometry(page);
});

test('generic option presentation supports separate cards and compact costs',async({page})=>{
  await ready(page);
  await render(page,{version:1,system:'generic',features:[{name:'Forms',presentation:'card',optionLayout:'cards',description:'Lasts one turn.',usage:{amount:1,resource:'Focus'},options:[{name:'Bear',description:'Strong.'},{name:'Bird',description:'Fly.',usage:{amount:2,resource:'Focus'}}]},{name:'Cast',presentation:'card',optionLayout:'compact',options:[{name:'Action',description:'Immediate effect.',usage:{amount:1,resource:'Slot'}},{name:'Ritual (+10 min)',description:'Same effect.',usage:{amount:0,resource:'Slots'}}]}]});
  await expect(sheet(page).locator('.reference-card')).toHaveCount(3);
  await expect(sheet(page).getByRole('heading',{name:'Forms: Bear',exact:true})).toHaveCount(1);
  await expect(sheet(page).getByRole('heading',{name:'Forms: Bird',exact:true})).toHaveCount(1);
  const compact=sheet(page).locator('.reference-card').filter({has:sheet(page).getByRole('heading',{name:'Cast',exact:true})});
  await expect(compact).toContainText('Ritual (+10 min): Same effect. [0 Slots]');
  await checkGeometry(page);
});

test('configured attribution appears on sheets and card templates with safe links',async()=>{
  const {renderCharacterDocument}=await import('../src/lib/sheet/render');
  const {renderFooter}=await import('../src/lib/sheet/footer');
  const html=renderCharacterDocument(premadeExamples[0].character,'https://sheets.example/test?x=1&y=2');
  expect(html.match(/Generated using/g)).toHaveLength(2);
  expect(html).toContain('href="https://sheets.example/test?x=1&amp;y=2"');
  expect(renderFooter()).not.toContain('Generated using');
  expect(()=>renderFooter('javascript:alert(1)')).toThrow('SITE_URL');
});
