// const timeline = new Timeline({
//     pauseWhenInvisible: true,
//     duration: 10000,
//     maxStep: 100,
//     maxFPS: 20,

//     // loop: true,

//     onInit: () => {console.log('timeline init');},
//     onStart: (time) => {console.log('timeline start', time);},
//     onEnd: (time) => {console.log('timeline end', time);},
//     // onUpdate: () => {console.log(timeline.playing);}
// })

// timeline.addTrack({
//     startTime: 1000,
//     duration: 2000,
//     onInit: () => console.log('init'),
//     onStart: (t) => {console.log('start', timeline.currentTime, t);},
//     // onUpdate: (time, p) => { console.log(timeline.currentTime) },
//     onUpdate: (time, p) => { document.body.innerHTML = `${time}\n${p}` },
//     onEnd: (t) => {console.log('end', timeline.currentTime, t);},
//     loop: true,
// })
//
// console.log(timeline.tracks[0]);

const m = document.createElement('div')
m.innerHTML = '0'
document.body.appendChild(m)

const timeline = new Timeline({
	pauseWhenInvisible: true,
	duration: Infinity,
	maxFPS: 30,
})

timeline.addTrack({
	duration: 3000,
	loop: true,
	onUpdate: (t, p) => {
		m.style.marginTop = '' + 1000 * p + 'px'
	},
})

timeline.play()

// let id = 0

// const s = () => {
//     id = timeline.setInterval(() => {
//         console.log('interval');
//         timeline.clearInterval(id)
//         s()
//     }, 2000);
// }

// s()
