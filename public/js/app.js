var ipAddresses = [];
var RTCPeerConnection = /*window.RTCPeerConnection ||*/ window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
var rtc = new RTCPeerConnection({iceServers:[]});

function getUrl(){

  if (RTCPeerConnection) (function () {
    if (1 || window.mozRTCPeerConnection) {      // FF [and now Chrome!] needs a channel/stream to proceed
        rtc.createDataChannel('', {reliable:false});
    };

    rtc.onicecandidate = function (evt) {
        // convert the candidate to SDP so we can run it through our general parser
        // see https://twitter.com/lancestout/status/525796175425720320 for details
        if (evt.candidate) grepSDP("a="+evt.candidate.candidate);
    };
    rtc.createOffer(function (offerDesc) {
        grepSDP(offerDesc.sdp);
        rtc.setLocalDescription(offerDesc);
    }, function (e) { console.warn("offer failed", e); });


    var addrs = Object.create(null);
    addrs["0.0.0.0"] = false;
    function updateDisplay(newAddr) {
        if (newAddr in addrs) return;
        else addrs[newAddr] = true;
        var displayAddrs = Object.keys(addrs).filter(function (k) { return addrs[k]; });
        ipAddresses = displayAddrs;
        //document.getElementById('list').textContent = displayAddrs.join(" or perhaps ") || "n/a";
        document.getElementById('ipList').textContent = "Your IP is : " + ( displayAddrs.join(" or ") || "n/a" );
    }

    function grepSDP(sdp) {
        var hosts = [];
        sdp.split('\r\n').forEach(function (line) { // c.f. http://tools.ietf.org/html/rfc4566#page-39
            if (~line.indexOf("a=candidate")) {     // http://tools.ietf.org/html/rfc4566#section-5.13
                var parts = line.split(' '),        // http://tools.ietf.org/html/rfc5245#section-15.1
                    addr = parts[4],
                    type = parts[7];
                if (type === 'host') updateDisplay(addr);
            } else if (~line.indexOf("c=")) {       // http://tools.ietf.org/html/rfc4566#section-5.7
                var parts = line.split(' '),
                    addr = parts[2];
                updateDisplay(addr);
            }
        });
    }
})();

}
getUrl();

// reveal server
document.getElementsByClassName('btn-type-server')[0].onclick = function(){

  document.getElementsByClassName('type-selection')[0].style.display = 'none';
  document.getElementsByClassName('type-server')[0].style.display = 'block';
  document.getElementsByClassName('type-client')[0].style.display = 'none';

  // get ips if not initialized
  if(ipAddresses.length == 0){
    getUrl();
  }

  var video = document.getElementById('vid-server');
  var stream = video.captureStream();

  var  peer1 = new SimplePeer({ initiator: true, stream: stream });

    peer1.on('error', function (err) { console.log('error', err) })

    peer1.on('signal', function (data) {
        setOffer(data, peer1);
    })

    peer1.on('connect', function () {
        console.log('CONNECT')
    })

    peer1.on('_iceComplete', function () {
        console.log('Completed')
    })

}

function setOffer(data, peer1){
     var url = "/pushOffers";

     var json = JSON.stringify(data);

     var xhr = new XMLHttpRequest();
     xhr.open("POST", url, true);
     xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
     xhr.onload = function () {
     	var response = JSON.parse(xhr.responseText);
     	if (xhr.readyState == 4 && xhr.status == "200") {
     		pollForJoins(peer1);
     	} else {
     		console.error(response);
     	}
     }
     xhr.send(json);
}

function setAnswer(data, peer1){
    var url = "/pushAnswer";

    var json = JSON.stringify(data);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
    xhr.onload = function () {
       var response = JSON.parse(xhr.responseText);
       if (xhr.readyState == 4 && xhr.status == "200") {
           console.log('Set Answer!');
       } else {
           console.error(response);
       }
    }
    xhr.send(json);
}

var isPolling = false;
function pollForJoins(peer1){

	if( !isPolling ){
		isPolling = true;
		// to be replace with a more efficient method
		setInterval(function(){

            var url = "/pullAnswers";
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if (xhr.readyState == XMLHttpRequest.DONE) {
                    data = JSON.parse(xhr.responseText);
                    if( data.SUCCESS == true ){
    					data.DATA.forEach(function(item, index){
    						console.log(item);
    						peer1.signal(item);
    					})
    				}
                }
            }
            xhr.open('GET', url, true);
            xhr.send(null);

		}, 3000);
	}
}
function getOffers(peer1){

    var url = "/pullOffers";
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            data = JSON.parse(xhr.responseText);
            if( data.SUCCESS == true ){
                data.DATA.forEach(function(item, index){
                    console.log(item);
                    peer1.signal(item);
                })
            }
        }
    }
    xhr.open('GET', url, true);
    xhr.send(null);
}

// reveal client
document.getElementsByClassName('btn-type-client')[0].onclick = function(){
  document.getElementsByClassName('type-selection')[0].style.display = 'none';
  document.getElementsByClassName('type-server')[0].style.display = 'none';
  document.getElementsByClassName('type-client')[0].style.display = 'block';

  var peer1 = new SimplePeer();

      peer1.on('error', function (err) { console.log('error', err) })

      peer1.on('signal', function (data) {
          setAnswer(data, peer1);
      })

      peer1.on('connect', function () {
          console.log('CONNECT')
      })

      peer1.on('_iceComplete', function () {
          console.log('Completed')
      })

        peer1.on('stream', function (stream) {
          // got remote video stream, now let's show it in a video tag
          var audio = document.querySelector('audio')
          audio.src = window.URL.createObjectURL(stream)
          audio.play()
        })

      getOffers(peer1);

}

function handleError(error) {
  console.log('navigator.getUserMedia error: ', error);
}
