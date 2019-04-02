const timeline = new Timeline({
	pauseWhenInvisible: true,
	duration: Infinity,
	maxStep: 100,
	maxFPS: 30,
})

const id0 = timeline.setTimeout(() => {
	console.log('timeoutA', timeline.currentTime)
}, 1000)

const id1 = timeline.setInterval(() => {
	console.log('interval', timeline.currentTime)
}, 1500)

const id2 = timeline.setTimeout(() => {
	console.log('timeoutB', timeline.currentTime)
}, 7000)

timeline.clearTimeout(id2)

console.log(id0, id1, id2)

timeline.setTimeout(function() {
	timeline.clearInterval(id1)
}, 5000)

timeline.play()
