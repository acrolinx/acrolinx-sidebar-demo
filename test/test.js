const chrome = require('selenium-webdriver/chrome');
const webdriver = require('selenium-webdriver');
const By = webdriver.By;

const TIMEOUT_MS = 10000;

describe("live demo", () => {
  let driver;
  jest.setTimeout(TIMEOUT_MS);

  beforeEach(() => {
    driver = new webdriver.Builder()
      .forBrowser('chrome')
      .setChromeOptions(new chrome.Options().headless())
      .build();
    driver.manage().setTimeouts({implicit: TIMEOUT_MS});
  });

  afterEach(() => {
    driver.close();
    driver.quit();
  });

  it("displays Sidebar SDK JS version in the about-page of the start-page", async () => {
    driver.get('https://acrolinx.github.io/acrolinx-sidebar-demo/samples/single-editor.html');

    const sidebarIFrame = driver.findElement(By.css('iframe'));
    driver.switchTo().frame(sidebarIFrame);
    driver.findElement(By.linkText('About Acrolinx')).click();

    const sdkVersionLocator = By.xpath('//div[@class= "about-tab-label" and text() = "Sidebar SDK JS"]/following-sibling::div');
    const sdkVersion = await driver.findElement(sdkVersionLocator).getText();

    const versionParts = sdkVersion.split('.');
    expect(versionParts.length).toEqual(4);
    versionParts.forEach((versionPart) => {
      expect(versionPart).toMatch(/\d+/);
    });
  })
});
