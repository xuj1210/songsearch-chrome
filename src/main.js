// get relevant elements/nodes from document
let root = document.documentElement;
let body = document.body;
let recordBtn = document.getElementById('record-img');
let songList = document.getElementById('tracks-list');
let settingsBtn = document.getElementById('settings-img');
let garbageBtn = document.getElementById('garbage-img');

// load chosen background color and font, or just load default options
chrome.storage.sync.get(['bgColor', 'font'], (result => {
  // check if bgColor is already set, if it is use it
  if (result.bgColor) {
    body.style.background = result.bgColor;
  } else {
    body.style.background = "#c1c0fc";
  }

  // check if font is already set, if it is use it
  if (result.font) {
    root.style.setProperty('--font-fam', result.font);
  } else {
    root.style.setProperty('--fontFam', 'Raleway');
  }
}));

// crpto node module required for ACRCloud API
const crypto = require('crypto');

// handle initial loading of popup
let handleLoad = (event) => {
  console.log('loaded');

  // render cards for previously identified songs
  let storedSongs = [];
  chrome.storage.sync.get(['prevSongs'], (result) => {
    if (result.prevSongs) {
      storedSongs = result.prevSongs;
      for (const song of storedSongs) {
        songList.prepend(createCard(song));
      }
    }
  })
}

// handle clearing of song match history, deleting previously generated song cards. Also offer undo to revert deletion
let handleClear = (event) => {
  // visually remove song cards from history list
  let numberCards = songList.childNodes.length;
  for (let i = 0; i < numberCards; ++i) {
    songList.childNodes[0].remove();
  }

  let deletedSongs = [];
  // get stored songs in case user wants to undo
  chrome.storage.sync.get(['prevSongs'], (result) => {
    if (result.prevSongs) {
      for (const song of result.prevSongs) {
        deletedSongs.push(song);
      }

      // create undo message for user
      let undoMsg = document.createElement('div');
      undoMsg.id = 'undo-msg';
      undoMsg.style.fontFamily = 'Raleway, Roboto, sans-serif';
      undoMsg.innerHTML = '<span></span><span id="undo-text" class="clickable">Undo</span><span id="close-undo" class="clickable">&#x2715;</span>';
      root.append(undoMsg);

      // clear history from storage, unless user clicks undo this is permanent
      chrome.storage.sync.set({ "prevSongs": [] }, () => {
        console.log('cleared history')
      });

      let handleUndo = () => {
        // if there were previously deleted songs, re-render them and save them to storage
        if (deletedSongs.length > 0) {
          for (const song of deletedSongs) {
            songList.prepend(createCard(song));
          }
          chrome.storage.sync.set({ "prevSongs": deletedSongs }, () => {
            console.log("undid deletion of history")
          })
        }
        undoMsg.remove();
      }

      // slide in undo message
      undoMsg.classList.add('show-undo');

      // get text and close button elements from undo message, handle events when they are clicked
      let undoText = document.getElementById('undo-text')
      let undoClose = document.getElementById('close-undo');
      let handleCloseUndo = () => {
        undoMsg.remove();
      }
      undoText.addEventListener('click', handleUndo);
      undoClose.addEventListener('click', handleCloseUndo);
    }
  })
}

// handle clicking cog image, brings user to extension options
let handleSettings = (event) => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
}

// add event listeners for handle functions defined above
window.addEventListener('load', handleLoad);
settingsBtn.addEventListener('click', handleSettings);
garbageBtn.addEventListener('click', handleClear);

// function that emulates pausing for certain amount of milliseconds
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// render a new card given the song object passed to the function
let createCard = (song) => {
  // check that song is valid
  if (song) {
    let name = song.name;
    let artist = song.artist;
    let songInfo = `${song.name} ${song.artist}`;
    let newCard = document.createElement('li');
    newCard.innerHTML = `<div class="title">${name}</div><div>${artist}</div>`;

    // generate Spotify search link
    let spotifyLink = document.createElement('a');
    spotifyLink.href = "https://open.spotify.com/search/" + songInfo;
    spotifyLink.target = "_blank";
    spotifyLink.innerHTML = '<img src="/images/logos/spotify-icon25x25.png" class="logo"></img>'
    spotifyLink.classList.add('logo-link');

    // generate Youtube search link
    let youtubeLink = document.createElement('a');
    youtubeLink.href = "https://youtube.com/results?search_query=" + songInfo;
    youtubeLink.target = "_blank";
    youtubeLink.innerHTML = '<img src="/images/logos/youtube-icon25x25.png" class="logo">';
    youtubeLink.classList.add('logo-link');

    // generate Apple Music search link
    let appleMusic = document.createElement('a');
    appleMusic.href = "https://music.apple.com/us/search?term=" + songInfo;
    appleMusic.target = "_blank";
    appleMusic.innerHTML = '<img src="/images/logos/apple-music-icon.svg" class="logo">';
    youtubeLink.classList.add('logo-link');

    // add card to song list in document
    let wrapper = document.createElement('div');
    wrapper.appendChild(youtubeLink);
    wrapper.appendChild(spotifyLink);
    wrapper.appendChild(appleMusic);
    newCard.appendChild(wrapper);
    newCard.classList.add('song-card');
    return newCard;
  }
}

// The following is for using the ACRCloud Music Identification API

// options to be sent in fetch call
let defaultOptions = {
  host: 'identify-us-west-2.acrcloud.com',
  endpoint: '/v1/identify',
  signature_version: '1',
  data_type: 'audio',
  secure: true,
  access_key: '7b702e9b6d5f06ad491dc2b5de28da6d',
  access_secret: 'tnyqWJ3ifFHV9MT8L4yETo5OukVf5m0uBW6yRV2i'
};

// builds newline separated string from given parameters
function buildStringToSign(method, uri, accessKey, dataType, signatureVersion, timestamp) {
  return [method, uri, accessKey, dataType, signatureVersion, timestamp].join('\n');
}

// generates signature from given string
function sign(signString, accessSecret) {
  return crypto.createHmac('sha1', accessSecret)
    .update(Buffer.from(signString, 'utf-8'))
    .digest().toString('base64');
}

// calls fetch to ACRCloud API with given blob and options
function identify_blob(blob, options, cb) {
  // get current time
  let current_data = new Date();
  let timestamp = current_data.getTime() / 1000;

  // sign unique signature built from given options/info
  let stringToSign = buildStringToSign('POST',
    options.endpoint,
    options.access_key,
    options.data_type,
    options.signature_version,
    timestamp);
  let signature = sign(stringToSign, options.access_secret);

  // generate form to be sent in fetch call
  let form = new FormData();
  form.append('sample', blob);
  form.append('sample_bytes', blob.size);
  form.append('access_key', options.access_key);
  form.append('data_type', options.data_type);
  form.append('signature_version', options.signature_version);
  form.append('signature', signature);
  form.append('timestamp', timestamp);

  // options for fetch call
  const fetchOptions = {
    method: "POST",
    mode: "cors",
    body: form
  }

  // fetch info from ACRCloud API
  fetch("http://" + options.host + options.endpoint,
    fetchOptions)
    .then((res) => { return res.json() })
    .then((res) => { cb(res, null) })
    .catch((err) => { cb(null, err) });
}

// end of ACRCloud Music Identification API functions

// handles showing error message to user when the identification API was unable to identify the song
let handleFail = async () => {
  let failMsg = document.createElement('div');
  failMsg.id = 'failed';
  failMsg.style.fontFamily = 'Raleway, Roboto, sans-serif';
  failMsg.innerText = "Couldn't identify song";
  root.prepend(failMsg);
  failMsg.classList.add('alert');
  await sleep(5500);
  failMsg.remove();
}

// extracts relevant info from object retrieved through fetch call to ACRCloud API
let extractInfo = (info) => {
  if (info.status.code !== 0) {
    console.log('failed');
    handleFail();
    return;
  }
  let songInfo = info.metadata.music[0];
  let title = songInfo.title;
  // let album = songInfo.album.name;
  let artist = songInfo.artists[0].name;

  return {
    name: title,
    artist: artist
  }
}

// begin capturing current tab's audio
chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
  // ensure stream is valid
  if (stream) {
    // create audio element so audio playback isn't interrupted for user
    window.audio = document.createElement('audio');
    window.audio.srcObject = stream;
    window.audio.play();

    // get a MediaRecorder ready to record tab audio
    const mediaRecorder = new MediaRecorder(stream);

    // when record button is clicked, begin recording with MediaRecorder
    recordBtn.onclick = async () => {
      recordBtn.classList.add('recording');
      mediaRecorder.start();
      console.log(mediaRecorder.state);
      console.log('recorder started');

      // once ~6 seconds has passed, stop recording audio
      await sleep(6000)
      mediaRecorder.stop();
      console.log(mediaRecorder.state);
      console.log('recorder stopped');
    };

    // store blob generated from MediaRecorder once data is available
    let chunks = [];
    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    // when MediaRecorder is stopped (ie. once the ~6 seconds has elapsed), perform fetch call to ACRCloud API with audio data
    mediaRecorder.onstop = (event) => {
      console.log('recorder stopped, in onstop');

      const blob = new Blob(chunks, { 'type': 'audio/wav; codecs=MS_PCM' });

      // send blob data to ACRCloud API for song identification
      identify_blob(blob, defaultOptions, (err, httpResponse, body) => {
        recordBtn.classList.remove('recording');

        // process response data from ACRCloud API
        let songInfo = extractInfo(err);

        // if info extraction was successful (ie. song was successfully identified), render card for the new song
        if (songInfo) {
          songList.prepend(createCard(songInfo));

          // store song to Chrome storage
          let storedSongs = [];
          chrome.storage.sync.get(['prevSongs'], (result) => {
            console.log('Previous songs: ', result.prevSongs);
            if (result.prevSongs) {
              for (const song of result.prevSongs) {
                storedSongs.push(song);
              }
            }
            storedSongs.push(songInfo);
            console.log('Added list', storedSongs);
            chrome.storage.sync.set({ 'prevSongs': storedSongs }, () => {
              console.log("stored new song");
            });
          });
        };
        // reset chunks now that identification process is complete
        chunks = [];
      });
    }
  }
});