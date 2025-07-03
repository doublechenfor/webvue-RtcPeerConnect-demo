<script setup>
import { onMounted, reactive, ref } from "vue";
import HelloWorld from "./components/HelloWorld.vue";
import TheWelcome from "./components/TheWelcome.vue";

const srcObject = ref("");
const remoteObject = ref('')
let iceServiceReady = false;

let wsInstance = null;
const candidateOnlyList = [];
const ports = [];
const addresses = [];
const rtcInstance = new RTCPeerConnection({
  sdpSemantics: "plan-b",
  bundlePolicy: "max-compat",
  iceServers: [
    {
      urls: "stun:rockenstein.de:3478",
    },
  ],
  rtcpMuxPolicy: 'require'
});
wsInstance = new WebSocket("wss://192.168.50.6:443");

const isVaildCandidate = (candidate) => {
  // candidate info filter
  if (candidate?.port && candidate?.protocol && candidate?.type) {
  } else {
    return false;
  }
  if (candidateOnlyList.includes(candidate.foundation)) {
    return false;
  } else {
    candidateOnlyList.push(candidate.foundation);
  }

  if (ports.includes(candidate.port)) {
    return false;
  } else {
    ports.push(candidate.port);
  }

  if (addresses.includes(candidate.address)) {
    return false;
  } else {
    addresses.push(candidate.address);
  }

  if (!iceServiceReady && ["srflx", "host"].includes(candidate.type)) {
    iceServiceReady = true;
  } else {
    return false;
  }

  return true;
};

wsInstance.onerror = (res) => {};

wsInstance.onmessage = async (res) => {
  const data = JSON.parse(res.data);
  if (data.action === "joined") {
    console.log("-----", data.user);
    if (data.user !== window.navigator.userAgent) {
      const offer = new RTCSessionDescription(data.data);
      await rtcInstance.setRemoteDescription(offer);
      const answer = await rtcInstance.createAnswer();
      await rtcInstance.setLocalDescription(answer);
      rtcInstance.onicecandidate = (res) => {
        if (res.candidate && isVaildCandidate(res.candidate)) {
          wsInstance.send(
            JSON.stringify({
              action: "send-candidate",
              sys: window.navigator.userAgent,
              data: res.candidate,
            })
          );
        }
      };
      rtcInstance.oniceconnectionstatechange = (res) => {
        if (rtcInstance.iceConnectionState === "connected") {
          console.log("ICE connected!");
        } else if (rtcInstance.iceConnectionState === "failed") {
          //restart
          // rtcInstance.restartIce();
        }
      };
      wsInstance.send(
        JSON.stringify({
          action: "answer-offer",
          sys: window.navigator.userAgent,
          data: answer,
        })
      );
      console.log("answer done!!");
    }
  }

  if (data.action === "answer-offer") {
    if (data.user !== window.navigator.userAgent) {
      const offer = new RTCSessionDescription(data.data);
      await rtcInstance.setRemoteDescription(offer);
    }
  }

  if (data.action === "send-candidate") {
    if (data.user !== window.navigator.userAgent) {
      const newCanddidate = new RTCIceCandidate(data.data);
      await rtcInstance.addIceCandidate(newCanddidate);
      console.log("add candidate done!");
    }
  }

  if (data.action === "candidate-send-done") {
    if (data.user !== window.navigator.userAgent) {
    }
  }
};

wsInstance.onopen = (res) => {
  console.log("res onopen", res);
};

wsInstance.onclose = (res) => {
  console.log("res onclose", res);
};
onMounted(() => {
  window.navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then(async (mediaStream) => {
      srcObject.value = mediaStream;
      mediaStream.getTracks().forEach((track) => {
        rtcInstance.addTrack(track, mediaStream);
      });
      rtcInstance.ontrack = (event) => {
        remoteObject.value = event.streams[0];
      };

      if (
        window.navigator.userAgent ===
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0"
      ) {
        const sdp = await rtcInstance.createOffer();
        await rtcInstance.setLocalDescription(sdp);
        wsInstance.send(
          JSON.stringify({
            action: "push-stream",
            sys: window.navigator.userAgent,
            data: sdp,
          })
        );
        rtcInstance.onicecandidate = (res) => {
          if (res.candidate && isVaildCandidate(res.candidate)) {
            wsInstance.send(
              JSON.stringify({
                action: "send-candidate",
                sys: window.navigator.userAgent,
                data: res.candidate,
              })
            );

            setTimeout(() => {
              wsInstance.send(
                JSON.stringify({
                  action: "candidate-send-done",
                  sys: window.navigator.userAgent,
                  data: null,
                })
              );
            }, 5000);
          }
        };

        rtcInstance.oniceconnectionstatechange = () => {
          if (rtcInstance.iceConnectionState === "connected") {
            console.log("ICE connected!");
          } else if (rtcInstance.iceConnectionState === "failed") {
            // reconnect
            // rtcInstance.restartIce();
          }
        };
      }
    });
});

function joinB() {}
</script>

<template>
  <header>
    <div class="wrapper">
      <!-- <HelloWorld msg="You did it!" /> -->
    </div>
  </header>

  <main>
    <!-- <TheWelcome /> -->
    <div>
      <video
        :srcObject="srcObject"
        style="width: 400px; height: 300px"
        autoplay
        playsinline
      ></video>

      <video
        :srcObject="remoteObject"
        style="width: 300px; height: 200px; border: 1px solid #000"
        autoplay
        playsinline
      ></video>
    </div>
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
