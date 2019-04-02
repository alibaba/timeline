const timeline = new Timeline({
	pauseWhenInvisible: false,
	duration: Infinity,
})

// 添加Track

// // 总时长
// const D = 10 * 1000
// const C = 200
//
// window.R = []
//
// for (let i = 0; i < C; i++) {
//     timeline.addTrack({
//         startTime: D / C,
//         duration: 200,
//         onStart: () => R.push(i + 0.0),
//         onEnd: () => R.push(i + 0.5)
//     })
// }

/**
 * ==========================================
 *        A0=====================A1
 *            B0============B1
 */

// timeline.addTrack({
//     id: 'A',
//     startTime: 1000
//     duration: 3000,
//     onStart: () => console.log('A0'),
//     onEnd: () => console.log('A1'),
//     onUpdate: (t, p) => console.log('A update', t, p),
// })
//
// timeline.addTrack({
//     id: 'B',
//     startTime: 2000
//     duration: 1000,
//     onStart: () => console.log('B0'),
//     onEnd: () => console.log('B1'),
//     onUpdate: (t, p) => console.log('B update', t, p),
// })

timeline.play()

setTimeout(() => console.log(0.2), 0.2)
setTimeout(() => console.log(0.3), 0.3)
setTimeout(() => console.log(0.4), 0.4)
setTimeout(() => console.log(0.1), 0.1)
setTimeout(() => console.log(0.5), 0.5)
