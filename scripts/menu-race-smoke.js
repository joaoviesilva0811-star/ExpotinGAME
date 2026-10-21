import {chromium}from'playwright-core';import assert from'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.TEST_URL||'http://127.0.0.1:3015');await page.waitForFunction(()=>window.IRON_ASSETS_READY);await page.locator('#player-name').fill('Menu QA');await page.locator('#guest-submit').click();await page.locator('#session-panel').waitFor({state:'visible'});
 for(const [button,endpoint]of[['#ranking','leaderboard'],['#public-rooms','rooms']]){
  let pending;await page.route('**/api/'+endpoint,route=>{pending=route;});await page.locator(button).click();await page.waitForFunction(()=>document.querySelector('#modal').open);while(!pending)await page.waitForTimeout(20);
  await page.locator('#close-modal').click();await page.locator('#help').click();const before=await page.locator('#modal-content').innerHTML();await pending.fulfill({contentType:'application/json',body:'[]'});await page.waitForTimeout(200);assert.equal(await page.locator('#modal-content').innerHTML(),before);await page.locator('#close-modal').click();await page.unroute('**/api/'+endpoint);
 }
 assert.deepEqual(errors,[]);console.log('PASS: delayed room/ranking responses cannot replace a newer menu or reopen a closed dialog.');
}finally{await browser.close();}
