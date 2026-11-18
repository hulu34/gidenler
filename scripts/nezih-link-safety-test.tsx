import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {blockedVenueHost, safeVenueWebsite, mentionsBlockedVenueHost} from '../lib/venueLinkSafety';
import {realEntities, realVenueRecords, activeEntities} from '../data/real';
import {withProfile, ProfileOverview, ProfileMenu} from '../components/venue/profile/ProfileSections';
import {RealVenueNotice} from '../components/venue/VenueBadges';
import {VenueInfo} from '../components/venue/VenueInfo';
import {ReservationBlock} from '../components/reservation/ReservationBlock';
import type {PlaceProfile} from '../lib/profile';
(globalThis as typeof globalThis & {React:typeof React}).React=React;
const bad=['http:nezihkebap.com','http:/nezihkebap.com','https:takanik.com.tr','https:/takanik.com.tr','https://nezihkebap.com','http://www.nezihkebap.com/menu','HTTPS://WWW.NEZIHKEBAP.COM.:443/a','//nezihkebap.com/a','nezihkebap.com','nezihkebap.com:443/a','https://booking.nezihkebap.com','https://takanik.com.tr','http://WWW.TAKANIK.COM.TR./menu','//takanik.com.tr','takanik.com.tr:443/a'];
for(const u of bad){assert.ok(blockedVenueHost(u),u);assert.equal(safeVenueWebsite(u),undefined);}
for(const u of ['https://kiyi.com.tr','https://notnezihkebap.com','https://nezihkebap.com.example.org','https://example.org/nezihkebap.com'])assert.equal(safeVenueWebsite(u),u);
assert.ok(mentionsBlockedVenueHost('Rezervasyon: https://www.nezihkebap.com/rezervasyon'));
assert.equal(mentionsBlockedVenueHost('https://notnezihkebap.com'),false);
const slug='nezih-kebap-yuvalama-sariyer', e=realEntities.find(x=>x.slug===slug)!;
assert.ok(e);assert.ok(activeEntities.some(x=>x.slug===slug));assert.equal(realVenueRecords.length,884);assert.equal(realVenueRecords.find(x=>x.slug===slug)?.website,undefined);
const injected={...e,contact:{...e.contact,phone:'+902121234567',website:bad[0]}};
const field={value:bad[0],url:bad[0],provider:'official_site',checkedAt:'2026-11-18'};
const p:PlaceProfile={website:field,reservation:{...field,value:'Rezervasyon için https://nezihkebap.com/rezervasyon'},notes:[],amenities:null,menu:{...field,pricesPublished:false,sections:[{title:'Menü',items:[{name:'Kebap'}]}]}};
assert.equal(withProfile(injected,p).contact?.website,undefined);assert.equal(withProfile(injected,null).contact?.website,undefined);
for (const domain of ['https://nezihkebap.com','https://takanik.com.tr']) {
 injected.contact.website=domain;p.website={...field,value:domain,url:domain};p.reservation={...field,value:`Rezervasyon ${domain}/rezervasyon`,url:domain};p.menu!.url=domain;
 assert.equal(withProfile(injected,p).contact?.website,undefined);
for(const node of [<RealVenueNotice entity={injected}/>,<VenueInfo entity={injected}/>,<ReservationBlock entity={injected}/>,<ProfileOverview entity={injected} p={p} googleHours={false}/>,<ProfileMenu m={p.menu!}/>]){
 const html=renderToStaticMarkup(node);assert.ok(!/href="[^"]*(?:nezihkebap\.com|takanik\.com\.tr)/i.test(html),html);assert.ok(!html.includes(domain+'/rezervasyon'));
}
}
const takanik=realVenueRecords.find(x=>x.slug==='takanik-balik-park-sariyer')!;assert.ok(takanik);assert.equal(takanik.website,undefined);assert.ok(activeEntities.some(x=>x.slug===takanik.slug));
const good={...injected,contact:{...injected.contact,website:'https://kiyi.com.tr'}};
assert.ok(renderToStaticMarkup(<ReservationBlock entity={good}/>).includes('https://kiyi.com.tr'));
assert.ok(renderToStaticMarkup(<ReservationBlock entity={injected}/>).includes('tel:+902121234567'));
console.log('PASS Nezih/Takanık host safety: URL variants, DB/profile reinjection, reservation, menu/source, record/phone and other domains preserved.');
