const m = document.createElement('div')
m.innerHTML = '0'
document.body.appendChild(m)
const timeline = new Timeline({ pauseWhenInvisible: true, duration: Infinity, maxFPS: 30 })
timeline.addTrack({
	duration: 3000,
	loop: true,
	onUpdate: (t, p) => {
		m.style.marginTop = '' + 1000 * p + 'px'
	},
})
timeline.play()
