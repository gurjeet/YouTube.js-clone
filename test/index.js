'use strict';

const Fs = require('fs');
const Innertube = require('..');
const NToken = require('../lib/deciphers/NToken');
const SigDecipher = require('../lib/deciphers/Sig');
const Constants = require('./constants');

let failed_tests = 0;

async function performTests() {
  const youtube = await new Innertube().catch((error) => error);
  assert(!(youtube instanceof Error), `should retrieve Innertube configuration data`, youtube);

  if (!(youtube instanceof Error)) {
    const homefeed = await youtube.getHomeFeed();
    assert(!(homefeed instanceof Error), `should retrieve recommendations`, homefeed);
    
    const ytsearch = await youtube.search('Carl Sagan - Documentary').catch((error) => error);
    assert(!(ytsearch instanceof Error) && ytsearch.videos.length, `should search on YouTube`, ytsearch);
    
    const ytmsearch = await youtube.search('Logic - Obediently Yours', { client: 'YTMUSIC' }).catch((error) => error);
    assert(!(ytmsearch instanceof Error), `should search on YouTube Music`, ytmsearch);
     
    const ytsearch_suggestions = await youtube.getSearchSuggestions('test', { client: 'YOUTUBE' });
    assert(!(ytsearch_suggestions instanceof Error), `should retrieve YouTube search suggestions`);
     
    const ytmsearch_suggestions = await youtube.getSearchSuggestions('test', { client: 'YTMUSIC' });
    assert(!(ytmsearch_suggestions instanceof Error), `should retrieve YouTube Music search suggestions`);
     
    const details = await youtube.getDetails(Constants.test_video_id).catch((error) => error);
    assert(!(details instanceof Error), `should retrieve details for ${Constants.test_video_id}`, details);

    const comments = await youtube.getComments(Constants.test_video_id).catch((error) => error);
    assert(!(comments instanceof Error), `should retrieve comments for ${Constants.test_video_id}`, comments);
    
    const ytplaylist = await youtube.getPlaylist(ytmsearch.results.community_playlists[0].id, { client: 'YOUTUBE' });
    assert(!(ytplaylist instanceof Error), `should retrieve and parse playlist with YouTube`, ytplaylist);
    
    const ytmplaylist = await youtube.getPlaylist(ytmsearch.results.community_playlists[0].id, { client: 'YTMUSIC' });
    assert(!(ytmplaylist instanceof Error), `should retrieve and parse playlist with YouTube Music`, ytmplaylist);
    
    const lyrics = await youtube.getLyrics(ytmsearch.results.songs[0].id);
    assert(!(lyrics instanceof Error), `should retrieve song lyrics`, lyrics);
    
    const video = await downloadVideo(Constants.test_video_id, youtube).catch((error) => error);
    assert(!(video instanceof Error), `should download video (${Constants.test_video_id})`, video);
  }

  const n_token = new NToken(Constants.n_scramble_sc, Constants.original_ntoken).transform();
  assert(n_token == Constants.expected_ntoken, `should transform n token into ${Constants.expected_ntoken}`, n_token);

  const transformed_url = new SigDecipher(Constants.test_url, { sig_decipher_sc: Constants.sig_decipher_sc }).decipher();
  assert(transformed_url == Constants.expected_url, `should correctly decipher signature`, transformed_url);

  if (failed_tests > 0)
    throw new Error('Some tests have failed');
}

function downloadVideo(id, youtube) {
  return new Promise((resolve, reject) => {
    let got_video_info = false;
    const stream = youtube.download(id, { type: 'videoandaudio' });
    stream.pipe(Fs.createWriteStream(`./${id}.mp4`));
    stream.on('end', () => Fs.existsSync(`./${id}.mp4`) && got_video_info && resolve() || reject());
    stream.on('info', () => got_video_info = true);
    stream.on('error', (err) => reject(err));
  });
}

function assert(outcome, description, data) {
  const pass_fail = outcome ? 'pass' : 'fail';

  console.info(pass_fail, ':', description);
  !outcome && (failed_tests += 1);
  !outcome && console.error('Error: ', data);

  return outcome;
}

performTests();