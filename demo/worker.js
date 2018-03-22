import Worker from 'worker-loader!./w.js'

const w = new Worker()

import Timeline from '../dist/Timeline';
const timeline = new Timeline({})
