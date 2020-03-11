let model
let stream
let isLooping = false
let canScroll = false
let hasSetOrigin = false
let scrollOrigin = [0, 0]
let scrollSpeed = 2.5

let tween = {
  x: 0,
  y: 0
}

const $video = document.querySelector('video')
const $canvas = document.querySelector('canvas')
const ctx = $canvas.getContext('2d')
const $button = document.querySelector('button')

let $map
let projection

/**
 * Required for Google Maps
 */
window.initMap = function() {
  $map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 45.512384, lng: -122.662133 },
    zoom: 13
  })
}

/**
 * Starts tracking with handpose
 */
async function startTracking() {
  $button.innerHTML = 'loading...'
  $button.setAttribute('disabled', true)

  model = await handpose.load()
  getMediaStream()
}

/**
 * Captures the media stream and attaches it to the video element
 */
async function getMediaStream() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
  $video.srcObject = stream
  $video.onloadedmetadata = () => {
    $video.play()
    $canvas.width = $video.width
    $canvas.height = $video.height
    $button.remove()

    document.body.classList.add('loaded')
    isLooping = true
    projection = $map.getProjection()
    loop()
  }
}

/**
 * Our main "game loop"
 */
async function loop() {
  const hands = await model.estimateHands($video)

  ctx.clearRect(0, 0, $canvas.width, $canvas.height)

  hands.forEach((hand) => {
    drawHand(hand)
    checkForScrollGesture(hand)
    scrollMap(hand)
  })

  isLooping && requestAnimationFrame(() => isLooping && loop())
}

/**
 * Checks for scrolling gesture
 */
function checkForScrollGesture(hand) {
  let thumb = hand.landmarks[4]
  let pointer = hand.landmarks[8]
  let a = thumb[0] - pointer[0]
  let b = thumb[1] - pointer[1]
  let dist = Math.sqrt(a * a + b * b)

  if (dist < 40) {
    canScroll = true
  } else {
    canScroll = false
    hasSetOrigin = false
  }

  if (canScroll && !hasSetOrigin) {
    let pixelCenter = projection.fromLatLngToPoint($map.getCenter())
    hasSetOrigin = true
    tween.x = pixelCenter.x
    tween.y = pixelCenter.y
    scrollOrigin = [pixelCenter.x, pixelCenter.y, thumb[0], thumb[1]]
  }
}

/**
 * Scrolls the map
 */
function scrollMap(hand) {
  if (canScroll) {
    let delta = {
      x: hand.landmarks[4][0] - scrollOrigin[2],
      y: scrollOrigin[3] - hand.landmarks[4][1]
    }

    let pixelCenter = projection.fromLatLngToPoint($map.getCenter())
    let x = scrollOrigin[0] + delta.x * 0.0005
    let y = scrollOrigin[1] + delta.y * 0.0005

    TweenMax.to(tween, 1, {
      x,
      y,
      overwrite: true,
      ease: 'linear.easeNone',
      immediate: true
    })
    pixelCenter.x = tween.x
    pixelCenter.y = tween.y

    $map.setCenter(projection.fromPointToLatLng(pixelCenter))
  }
}

/**
 * Draws the hands on a canvas
 */
window.focusPoint = 0
function drawHand(hand) {
  hand.landmarks.forEach((point, i) => {
    let radius = 3
    ctx.fillStyle = '#000'

    if ([4, 8, 12, 16, 20].includes(i)) {
      ctx.fillStyle = '#f00'
      radius = 6
    }

    ctx.beginPath()
    ctx.arc(point[0], point[1], radius, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.fill()
  })
}
