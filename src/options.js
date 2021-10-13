// get relevant elements/nodes from document
let root = document.documentElement;
let body = document.body;
let bgColor = document.getElementById('bg-color');
let saveBtn = document.getElementById('save');
let saveConfirm = document.getElementById('save-confirmation');
let fontSelection = document.getElementById('font-choice');
let quicksand = document.getElementById('quicksand');
let raleway = document.getElementById('raleway');
let roboto = document.getElementById('roboto');

// set currentFont to default value of Raleway
let currentFont = 'Raleway';

// get user saved settings for background color and font
chrome.storage.sync.get(['bgColor', 'font'], (result) => {
  // if background color is already set, use it
  if (result.bgColor) {
    bgColor.value = result.bgColor;
    body.style.background = result.bgColor;
  } else {
    bgColor.value = '#a19eff'
    body.style.background = '#a19eff'
  }
  // if font is already set, use it
  if (result.font) {
    root.style.setProperty('--font', result.font);
    currentFont = result.font;
  }
  // change current font displayed
  fontSelection.innerText = currentFont + ' (current)';
  changeFont(currentFont);
})

// handle changing background color with value from color picker
let handleColor = () => {
  body.style.background = bgColor.value;
}
bgColor.addEventListener('input', handleColor);

// defining font familys for fonts
let quicksandFont = "Quicksand, sans-serif";
let ralewayFont = "Raleway, sans-serif";
let robotoFont = "Roboto, sans-serif";

// handle changing font for document
let changeFont = (font) => {
  console.log('changing font');
  root.style.setProperty('--fontFam', font);
};

// handle changing font to Quicksand
let handleQuicksand = () => {
  fontSelection.innerText = 'Quicksand';
  // fontSelection.style.fontFamily = quicksandFont;
  currentFont = 'Quicksand';
  changeFont('Quicksand');
};

// handle changing font to Raleway
let handleRaleway = () => {
  fontSelection.innerText = 'Raleway (default)';
  // fontSelection.style.fontFamily = ralewayFont;
  currentFont = 'Raleway';
  changeFont('Raleway');
};

// handle changing font to Roboto
let handleRoboto = () => {
  fontSelection.innerText = 'Roboto';
  // fontSelection.style.fontFamily = robotoFont;
  currentFont = 'Roboto';
  changeFont('Roboto');
};

// event listeners for when font options are clicked/chosen
quicksand.addEventListener('click', handleQuicksand);
raleway.addEventListener('click', handleRaleway);
roboto.addEventListener('click', handleRoboto);

// function to emulate pausing for given amount of milliseconds
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

// handle saving user inputs to Chrome storage
let handleSave = (event) => {
  chrome.storage.sync.set({ "bgColor": bgColor.value, "font": currentFont }, async () => {
    console.log('Background color set to %cthis', `color: ${bgColor.value}`);
    console.log(`Changed font to ${currentFont}`);
    saveBtn.innerText = 'Saved!'
    let oldColour = saveBtn.style.background;
    saveBtn.style.background = '#77eeab'
    await sleep(1200);
    saveBtn.style.background = oldColour;
    saveBtn.innerText = 'Save';
  });
};
saveBtn.addEventListener('click', handleSave);