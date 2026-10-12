(function () {
  'use strict';
  var deck = document.querySelector('hyperframes-slideshow');
  var replay = document.querySelector('#replay-slide');
  var player = document.querySelector('hyperframes-player');
  replay.addEventListener('click', function () {
    var frame = player.iframeElement;
    if (frame && frame.contentWindow.__hfReplayCurrentSlide) frame.contentWindow.__hfReplayCurrentSlide();
    deck.focus({ preventScroll: true });
  });
  window.addEventListener('message', function (event) {
    if (event.origin !== location.origin || event.source !== player.iframeElement?.contentWindow) return;
    if (event.data?.source === 'mrfoundry-deck' && event.data.type === 'slide') replay.hidden = !event.data.replayable;
  });
  window.addEventListener('load', function () { deck.focus({ preventScroll: true }); });

})();
