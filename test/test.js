/*
 *
 * * Copyright 2019-present Acrolinx GmbH
 * *
 * * Licensed under the Apache License, Version 2.0 (the "License");
 * * you may not use this file except in compliance with the License.
 * * You may obtain a copy of the License at
 * *
 * * http://www.apache.org/licenses/LICENSE-2.0
 * *
 * * Unless required by applicable law or agreed to in writing, software
 * * distributed under the License is distributed on an "AS IS" BASIS,
 * * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * * See the License for the specific language governing permissions and
 * * limitations under the License.
 * *
 * * For more information visit: https://www.acrolinx.com
 *
 */

const chrome = require('selenium-webdriver/chrome');
const webdriver = require('selenium-webdriver');
require('dotenv').config();

const fs = require('fs');
const By = webdriver.By;
const Until = webdriver.until;

const TIMEOUT_MS = 30000;

describe('live demo', () => {
  const wordAndIssuesRegex = /\d words and \d issues?/;
  jest.setTimeout(TIMEOUT_MS * 2);

  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments('--remote-debugging-port=9225');
  const chromeBinaryPath = process.env.CHROME_BIN_PATH
  if (chromeBinaryPath) {
    console.log(`Chrome Binary path: ${chromeBinaryPath}`);
    chromeOptions.setBinaryPath(chromeBinaryPath);
  }
  if (!process.env.withwindow) {
    chromeOptions.addArguments("--headless");
  }
  let driver;

  beforeEach(async () => {
    driver = new webdriver.Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
    driver.manage().setTimeouts({ implicit: TIMEOUT_MS });
  }, TIMEOUT_MS * 2);

  afterEach(async () => {
    await driver.quit();
  }, TIMEOUT_MS * 2);

  const getWaiting = async (locator) => {
    return await driver.wait(Until.elementLocated(locator), TIMEOUT_MS);
  };

  it('displays Sidebar SDK JS version in the about-page of the start-page', async () => {
    await driver.get(
      'https://acrolinx.github.io/acrolinx-sidebar-demo/samples/single-editor.html'
    );

    const sidebarIFrame = await getWaiting(By.css('#sidebarContainer iframe'));
    await driver.switchTo().frame(sidebarIFrame);
    await (await getWaiting(By.linkText('About Acrolinx'))).click();

    const sdkVersionLocator = By.xpath(
      '//div[@class= "about-tab-label" and text() = "Sidebar SDK JS"]/following-sibling::div'
    );
    const sdkVersion = await (await getWaiting(sdkVersionLocator)).getText();

    const versionParts = sdkVersion.split('.');
    expect(versionParts.length).toEqual(3);
    versionParts.forEach((versionPart) => {
      expect(versionPart).toMatch(/\d+/);
    });
  });

  const checkSidebarAboutAndReturn = async () => {
    await (await getWaiting(By.css('.signinAboutLink'))).click();

    const sdkVersionLocator = By.xpath(
      '//div[@class= "about-tab-label" and text() = "Sidebar SDK JS"]/following-sibling::div'
    );
    const sdkVersion = await (await getWaiting(sdkVersionLocator)).getText();

    const versionParts = sdkVersion.split('.');
    expect(versionParts.length).toEqual(3);
    versionParts.forEach((versionPart) => {
      expect(versionPart).toMatch(/\d+/);
    });

    await (await getWaiting(By.css('.icon-menuBack'))).click();
  };

  const switchToSidebarFrameWithinTheFloatingSidebar = async () => {
    const sidebarIFrame = await getWaiting(
      By.css('#acrolinxSidebarContainer iframe')
    );
    await driver.switchTo().frame(sidebarIFrame);

    const sidebarInnerIFrame = await getWaiting(By.css('iframe'));
    await driver.switchTo().frame(sidebarInnerIFrame);
  };

  const runLiveCodingCodeInPageScope = async (sampleScriptName) => {
    const code = fs.readFileSync('samples/' + sampleScriptName, 'UTF-8');
    await driver.executeScript(code);
  };

  const loadCmPageAndPrepareSampleContent = async () => {
    await driver.get('https://codemirror.net/');
    const setCodeMirrorContent =
      'view.dispatch(view.state.update({changes: {from: 0, to: view.state.doc.length, insert: "<html><body><h1>live demo</h1><div>This is an tesst</div></body></html>"}}));';
    await driver.executeScript(setCodeMirrorContent);
  };

  const loadCkPageAndPrepareContent = async () => {
    await driver.get(
      'https://ckeditor.com/docs/ckeditor5/latest/examples/builds/balloon-editor.html'
    );
    const ckeditiorClass = '.ck-editor__editable';
    await driver.wait(Until.elementLocated(By.css(ckeditiorClass)));

    const setCkContent = `document.querySelector("${ckeditiorClass}").ckeditorInstance.data.set("<p>This is an tesst</p>")`;
    await driver.executeScript(setCkContent);
  };

  const clickSignInAndswitchToNewWindow = async () => {
    const windowsBefore = await driver.getAllWindowHandles();

    expect(windowsBefore.length).toEqual(1);

    await (await getWaiting(By.css('.signinOpenBrowserButton'))).click();

    await driver.wait(async () => {
      return (await driver.getAllWindowHandles()).length == 2;
    }, TIMEOUT_MS);

    const windowsAfter = await driver.getAllWindowHandles();

    expect(windowsAfter.length).toEqual(2);

    await driver.switchTo().window(windowsAfter[1]);
  };

  const signInAndConfirm = async () => {
    await (
      await getWaiting(By.css("input[name='username']"))
    ).sendKeys(process.env.testserver_username);
    await (
      await getWaiting(By.css("input[name='password']"))
    ).sendKeys(process.env.testserver_password);

    await (await getWaiting(By.css("button[type='submit']"))).click();

    const confirmButton = By.xpath('//button[text()[contains(.,"Confirm")]]');
    await (await getWaiting(confirmButton)).click();

    await driver.wait(Until.elementLocated(By.css('#confirm-message')));
  };
  const closeWindowAndSwitchBackToMainWindow = async () => {
    await driver.close();

    expect((await driver.getAllWindowHandles()).length).toEqual(1);
    await driver.switchTo().window((await driver.getAllWindowHandles())[0]);
  };

  const waitForSidebarCompleteSignInAndCheck = async () => {
    await (
      await getWaiting(By.css('.button-check--inline:not(.disabled)'))
    ).click();
  };

  it('live coding ckeditor', async () => {
    await loadCkPageAndPrepareContent();

    await runLiveCodingCodeInPageScope('live-coding-ck.js');

    await switchToSidebarFrameWithinTheFloatingSidebar();
    await checkSidebarAboutAndReturn();

    await clickSignInAndswitchToNewWindow();
    await signInAndConfirm();
    await closeWindowAndSwitchBackToMainWindow();
    await switchToSidebarFrameWithinTheFloatingSidebar();

    await waitForSidebarCompleteSignInAndCheck();

    const issuesMessage = await (
      await getWaiting(By.css('.issue-count-banner'))
    ).getText();

    expect(issuesMessage).toMatch(wordAndIssuesRegex);
  });

  it('live coding code mirror', async () => {
    await loadCmPageAndPrepareSampleContent();

    await runLiveCodingCodeInPageScope('live-coding.js');

    await switchToSidebarFrameWithinTheFloatingSidebar();
    await checkSidebarAboutAndReturn();

    await clickSignInAndswitchToNewWindow();
    await signInAndConfirm();
    await closeWindowAndSwitchBackToMainWindow();
    await switchToSidebarFrameWithinTheFloatingSidebar();

    await waitForSidebarCompleteSignInAndCheck();

    const issuesMessage = await (
      await getWaiting(By.css('.issue-count-banner'))
    ).getText();

    expect(issuesMessage).toMatch(wordAndIssuesRegex);
  });
});
