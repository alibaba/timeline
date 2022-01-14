/**
 * Copyright (c) 2017 Alibaba Group Holding Limited
 */

/**************************************************
 * Timeline                                       *
 * Manage All Your Events And Animations Together *
 * @author Simon(西萌) <gaomeng1900@gmail.com>     *
 **************************************************/

import TrackGroup from './TrackGroup'
import { getTimeNow, raf, cancelRaf } from './utils'
import Stats from './plugins/stats'

// 默认配置
const CONFIG_DEFAULT = {
	duration: Infinity,
	loop: false,
	autoRecevery: true,
	// 页面非激活状态（requestAnimationFrame不工作）时，自动停止播放
	// 避免长时间页面切走后切回，造成的时间突进
	pauseWhenInvisible: false,
	// 最长帧时间限制，如果帧长度超过这个值，则会被压缩到这个值
	// 用于避免打断点时继续计时，端点结束后时间突进
	maxStep: Infinity,
	// 最大帧率限制
	maxFPS: Infinity,

	// 是否假设每两次requestAnimationFrame之间的间隔是相同的
	fixStep: null,

	// 如果回调抛错是否继续运行，如果关闭此项，回调抛错会导致整个timeline停止运行
	ignoreErrors: true,
	// catch到的error是否要输出，如果开启ignoreErrors并且开启outputErrors，可能会由于连续打印错误而造成内存溢出
	outputErrors: true,

	// @TODO: 保证每个节点的执行顺序
	// orderGuarantee: true,

	// 开启性能面板
	openStats: false,

	// 记录FPS
	// recordFPS: true,
	recordFPSDecay: 0.5,

	onInit: () => {},
	onStart: () => {},
	onEnd: () => {},
	onUpdate: () => {},

	// 帧率限制造成的跳帧，用于再外部判断当前性能是否剩余
	// TODO 由于浏览器帧率分配机制，该回掉可能起不到作用
	// onSkipFrame: () => {},
}

// 最大等待队列，超出后将舍弃最久的pull request
const MAX_WAIT_QUEUE = 2

/**
 * Timeline 🌺 🌺 🌺
 * 接口风格与MediaElement保持一致
 */
export default class Timeline extends TrackGroup {
	// 直接从package.json读取
	static get VERSION() {
		return VERSION
	}

	// 创建一个Timeline实例，建议全局使用一个实例来方便同一控制所有行为与动画
	constructor(config) {
		config = {
			...CONFIG_DEFAULT,
			...config,
		}

		// a timeline instance, unlike a track, must start from 0.
		config.startTime = 0

		super(config)
		this.isTimeline = true

		this.duration = this.config.duration

		// 频率限制
		this.minFrame = 900 / this.config.maxFPS

		this._lastCurrentTime = 0
		this.referenceTime = this._getTimeNow() // 参考时间

		this.animationFrameID = 0

		this.playing = false

		// @proposal 把需要执行的tick排序执行（orderGuarantee）
		// this._ticks = []

		// pauseWhenInvisible
		this._hidden = null // used to detect if `document.hidden` works correctly (may not in webviews)
		this._timeBeforeHidden = 0
		this._timeBeforePaused = 0

		this._timeoutID = 0 // 用于给setTimeout和setInterval分配ID

		// fixStep
		this._supTimeNow = 0

		// remote
		this.ports = []
		this.listeners = []

		// shadow - origin
		this.localShadows = []
		this.remoteShadows = []

		this.config.origin && this.setOrigin(this.config.origin)

		// 统计FPS
		this.fps = 0
		this.frametime = 0

		// 不可以在非浏览器渲染线程中使用的接口
		if (
			typeof document === 'undefined' &&
			(this.config.openStats || this.config.pauseWhenInvisible)
		) {
			console.error(
				'timeline::"openStats" and "pauseWhenInvisible" only works in rendering thread'
			)
			this.config.openStats = false
			this.config.pauseWhenInvisible = false
		}

		// 显示性能指标
		if (this.config.openStats) {
			this.stats = new Stats()
			this.stats.showPanel(0)
			document.body.appendChild(this.stats.dom)
		}

		// 页面不可见时暂停计时
		// @NOTE electron的webview中visibilitychange接口行为错乱
		if (this.config.pauseWhenInvisible) {
			this._onvisibilitychange = () => {
				// 如果已经被控制，则不做判断
				if (this.origin) return
				if (document.hidden) {
					if (this._hidden === true) {
						console.error('timeline::document.hidden seems not working')
					}
					this._hidden = true
					this._timeBeforeHidden = this.currentTime
					cancelRaf(this.animationFrameID)
				} else {
					if (this._hidden === false) {
						console.error('timeline::document.hidden seems not working')
					}
					this._hidden = false
					this.seek(this._timeBeforeHidden)
					if (this.playing) {
						this.tick()
					}
				}
			}
			document.addEventListener('visibilitychange', this._onvisibilitychange)
		}

		// 更新shadow时间
		// @TODO 能否进一步简化，和Track等效
		this.onUpdate = (time, p) => {
			// 逐个轨道处理
			for (let i = 0; i < this.tracks.length; i++) {
				this.tracks[i].tick(time)
			}

			this.config.onUpdate && this.config.onUpdate(time, p)
		}
	}

	// 相对时间，只能用来计算差值
	_getTimeNow() {
		// NOTE 固定帧长的话，则直接在当前时间（this.getTime()）基础上加上帧长，但是referenceTime首次计算时为undefined
		// return this.config.fixStep ? ((this.referenceTime || 0) + this.currentTime + this.config.fixStep) : getTimeNow();
		return this.config.fixStep ? this._supTimeNow : getTimeNow()
	}

	/**
	 * 每帧调用
	 * 尽快触发下一次回调，避免回调过程中抛出bug导致整个timeline停止运行
	 * 同时需要避免子级故障导致上级停止运行，上级故障可以导致子级停止
	 * @param  {Num}  time  opt, 跳转到特定时间, 单步逐帧播放
	 */
	tick(time) {
		// 不使用系统时间，假设每两次requestAnimationFrame之间的间距是相等的
		if (this.config.fixStep) this._supTimeNow += this.config.fixStep

		if (time === undefined) {
			const currentTime = this._getTimeNow() - this.referenceTime
			// FPS限制
			if (currentTime - this.currentTime < this.minFrame) {
				this.animationFrameID = raf(() => this.tick())
				// this.config.onSkipFrame()
				return this
			}
			this._lastCurrentTime = this.currentTime
			this.currentTime = currentTime
			// 最长帧限制
			const step = this.currentTime - this._lastCurrentTime
			if (step > this.config.maxStep) {
				this.seek(this._lastCurrentTime + this.config.maxStep)
			}
		} else {
			this.seek(time)
		}

		// @TODO 需要标定 try-catch-finally 在不同浏览器中对性能的影响
		try {
			// 帧率统计
			this.frametime =
				this.frametime * (1 - this.config.recordFPSDecay) +
				(this.currentTime - this._lastCurrentTime) * this.config.recordFPSDecay
			this.fps = 1000 / this.frametime

			if (this.stats) this.stats.begin()

			// @NOTE 不使用Track.tick中对于循环的处理
			if (this.currentTime >= this.duration && this.loop) {
				if (!this.started) {
					// 这里用running也一样
					this.started = true
					this.running = true

					this.onInit && this.onInit(time)
					this.onStart && this.onStart(this.currentTime)
				} else {
					this.onEnd && this.onEnd(this.currentTime)
					this.onStart && this.onStart(this.currentTime)
				}
				this.seek(0)
				for (let i = 0; i < this.tracks.length; i++) {
					if (this.tracks[i].started) {
						this.tracks[i].reset()
					}
				}
			}

			super.tick(this.currentTime)

			// 同步Timeline
			this.remoteShadows.forEach((shadow) => {
				const msg = {
					__timeline_type: 'tick',
					__timeline_id: this.id,
					__timeline_shadow_id: shadow.id,
					__timeline_msg: {
						currentTime: this.currentTime,
						duration: this.duration,
						referenceTime: this.referenceTime,
					},
				}

				if (shadow.waiting) {
					// 任务执行中，需要排队
					// console.log('任务执行中，需要排队', shadow.id)
					if (shadow.waitQueue.length >= MAX_WAIT_QUEUE) {
						// 队伍过长，挤掉前面的
						// console.log('等待队列满，将舍弃过旧的消息')
						shadow.waitQueue.shift()
					}
					shadow.waitQueue.push(msg)
				} else {
					// @TODO 是否可能在排队却没有任务在执行的情况？
					if (!shadow.waiting && shadow.waitQueue.length)
						console.error('在排队却没有任务在执行!!!')

					// 空闲状态，直接执行
					// f();
					shadow.waiting = true
					shadow.port.postMessage(msg)
				}
			})

			this.localShadows.forEach((shadow) => {
				shadow.currentTime = this.currentTime
				shadow.duration = this.duration
				shadow.referenceTime = this.referenceTime
				shadow.tick(this.currentTime)
			})

			// 自动回收
			// console.time('recovery')
			if (this.config.autoRecevery) {
				this.recovery()
			}
			// console.timeEnd('recovery')

			if (this.stats) this.stats.end()
		} catch (e) {
			if (!this.config.ignoreErrors || this.config.outputErrors) console.error(e)
			if (!this.config.ignoreErrors) {
				this.stop() // 避免与pauseWhenInvisible冲突
				throw e
			}
		}

		// 回调中抛出bug不应该导致整个timeline停止，
		// 因此这个必须放在所有回调之前
		// 然而alive是在super.tick中判断的，因此也不能放在最前面
		// 这里只能使用 try catch 或者 timeout
		// 或者总是开启raf循环，但是在入口判断是否直接抛弃
		if (time !== undefined) {
			this.playing = false
		} else if (this.alive) {
			this.animationFrameID = raf(() => this.tick())
		}

		return this
	}

	// 开始播放
	play() {
		this.stop()
		this.playing = true
		this.referenceTime = this._getTimeNow()
		this.tick()
		return this
	}

	// 调到指定时间
	seek(time) {
		this.currentTime = time
		this.referenceTime = this._getTimeNow() - time
		return this
	}

	// 停止播放
	stop() {
		this.playing = false
		cancelRaf(this.animationFrameID)
		return this
	}

	// 暂停播放
	pause() {
		this.playing = false
		this._timeBeforePaused = this.currentTime
		cancelRaf(this.animationFrameID)
		return this
	}

	// 从暂停中恢复， ** 不能从停止中恢复 **
	resume() {
		this.pause()
		this.seek(this._timeBeforePaused)
		this.playing = true
		this.tick()
		return this
	}

	// 清理掉整个Timeline，目前没有发现需要单独清理的溢出点
	destroy() {
		this.stop()
		this.tracks = []
	}

	// 以下接口行为与DOM标准保持一致，但是全部与timeline中的时间和行为对齐

	// 重写Dom标准中的 setTimeout
	setTimeout(callback, time = 10) {
		if (time < 0) time = 0
		const ID = this._timeoutID++
		this.addTrack({
			id: '__timeout__' + ID,
			startTime: this.currentTime + time,
			duration: 1000,
			loop: false,
			onStart: callback,
		})
		return ID
	}

	// 重写Dom标准中的 setInterval
	setInterval(callback, time = 10) {
		if (time < 0) time = 0
		const ID = this._timeoutID++
		this.addTrack({
			id: '__timeout__' + ID,
			startTime: this.currentTime + time,
			duration: time,
			loop: true,
			onStart: callback,
		})
		return ID
	}

	clearTimeout(ID) {
		const track = this.getTracksByID('__timeout__' + ID)[0]
		if (track) {
			track.alive = false
		}
	}

	clearInterval(ID) {
		this.clearTimeout(ID)
	}

	//

	getTime() {
		return this.referenceTime + this.currentTime
	}

	/**
	 * 监听来自一个通讯端口的消息，以作为其他timeline的Origin
	 * 如果要将本timeline作为其他上下文中timeline的源timeline，需要监听通信端口
	 * @param  {Worker|WorkerGlobalScope|MessagePort} port 通讯端口
	 */
	listen(port) {
		if (this.ports.includes(port)) return

		const listener = (e) => {
			// console.log(e);
			if (!e.data || e.data.__timeline_type !== 'PAIRING_REQ') return

			this._addShadow(port, e.data.__timeline_shadow_id)
			e.preventDefault()
			e.stopPropagation()
			e.stopImmediatePropagation() // IE 9
		}

		this.ports.push(port)
		this.listeners.push(listener)

		port.addEventListener('message', listener)
	}

	stopListen(port) {
		const index = this.ports.indexOf(port)
		const listener = this.listeners[index]

		if (index > -1) {
			this.ports.splice(index, 1)
			this.listeners.splice(index, 1)
		}

		port.removeEventListener('message', listener)
	}

	_addShadow(shadow, id) {
		// if ((!this.id && this.id !== 0))
		// 	throw new Error('你需要给当前Timeline指定ID才能够为其添加shadow')

		if (shadow.isTimeline) {
			// 本地
			shadow.config = {
				...this.config,
				// shadows: [],
				// onInit: null,
				// onStart: null,
				onUpdate: null,
				// onEnd: null,
			}
			shadow.duration = shadow.config.duration
			shadow.loop = shadow.config.loop
			shadow.onInit = null
			shadow.onStart = null
			shadow.onEnd = null

			this.localShadows.push(shadow)
		} else {
			// 远程
			const port = shadow
			const remoteShadow = {
				port,
				// 等待队列
				waitQueue: [],
				// 当前有任务在等待返回
				waiting: false,
				// 一对多，需要一个额外的ID
				id,
			}

			// 回执
			const msgHandler = (e) => {
				// console.log(e);
				if (!e.data || e.data.__timeline_shadow_id !== remoteShadow.id) return

				e.preventDefault()
				e.stopPropagation()
				e.stopImmediatePropagation() // IE 9

				if (e.data.__timeline_type === 'done') {
					remoteShadow.waiting = false
					// remoteShadow.waitQueue.length && shadow.waitQueue.shift()();
					if (remoteShadow.waitQueue.length) {
						remoteShadow.waiting = true
						remoteShadow.port.postMessage(remoteShadow.waitQueue.shift())
					}
				}
			}
			port.addEventListener('message', msgHandler)
			// 保存引用用于 remove
			remoteShadow.msgHandler = msgHandler

			// 同步初始状态
			port.postMessage({
				__timeline_type: 'init',
				// __timeline_id: this.config.id,
				// 分配端口ID
				__timeline_shadow_id: shadow.id,
				__timeline_msg: {
					...this.config,
					shadows: [],
					onInit: null,
					onStart: null,
					onUpdate: null,
					onEnd: null,
					onSkipFrame: null, // legacy
				},
			})

			this.remoteShadows.push(remoteShadow)
		}
	}

	/**
	 * 设置 Origin Timeline，将自己变成这个timeline的 shadow timeline
	 * 源timeline可以为远程timeline，此时应传入通信端口：
	 * 		- Worker|WorkerGlobalScope|MessagePort
	 * 源timeline也可以为本地上下文中的另一个Timeline，此时应传入实例
	 * @param {Timeline|Worker|WorkerGlobalScope|MessagePort} origin
	 */
	setOrigin(origin) {
		if (this.origin) throw new Error('该timeline已经设置过Origin')
		if (this === origin) throw new Error('不能将自身设为Origin')

		this.stop()

		this.origin = origin

		this.shadow_id = getTimeNow() + Math.random()

		// 本地Origin和远程Origin
		if (origin.isTimeline) {
			// 本地
			origin._addShadow(this, this.shadow_id)
		} else {
			// 远程
			const port = origin
			// 配对请求
			port.postMessage({
				__timeline_type: 'PAIRING_REQ',
				// __timeline_id: this.config.id,
				// 分配端口ID
				__timeline_shadow_id: this.shadow_id,
			})

			this._onOriginMessage = (e) => {
				const data = e.data

				// 已分配shadow_id，只接受自己的消息
				if (!data || data.__timeline_shadow_id !== this.shadow_id) return

				if (data.__timeline_type === 'init') {
					// console.log('接受分配', data);
					// 占用该port
					e.preventDefault()
					e.stopPropagation()
					e.stopImmediatePropagation() // IE 9
					// 初始化自身的设置
					this.config = data.__timeline_msg
					this.duration = this.config.duration
					this.loop = this.config.loop
				}

				if (data.__timeline_type === 'tick') {
					this.currentTime = data.__timeline_msg.currentTime
					this.duration = data.__timeline_msg.duration
					this.referenceTime = data.__timeline_msg.referenceTime
					this.tick(this.currentTime)
					// @NOTE currentTime会是对的，referenceTime会乱掉

					// 完成回执
					port.postMessage({
						__timeline_type: 'done',
						// __timeline_id: this.id,
						__timeline_shadow_id: this.shadow_id,
					})
				}
			}
			this.origin.addEventListener('message', this._onOriginMessage)
		}

		// 剥夺控制权
		this.seek = (time) => {
			this.currentTime = time
			return this
		}
		// this.tick = () => { console.error('ShadowTimeline shall not be edited derictly!'); }
		this.play = () => {
			console.error('ShadowTimeline shall not be edited derictly!')
		}
		this.stop = () => {
			console.error('ShadowTimeline shall not be edited derictly!')
		}
		this.pause = () => {
			console.error('ShadowTimeline shall not be edited derictly!')
		}
		this.resume = () => {
			console.error('ShadowTimeline shall not be edited derictly!')
		}
	}

	// 更新maxFPS
	updateMaxFPS(maxFPS) {
		this.config.maxFPS = maxFPS
		this.minFrame = 900 / this.config.maxFPS
	}

	// 清理
	dispose() {
		this.stop()
		this.play = null
		this.tick = null

		if (this.stats) {
			document.body.removeChild(this.stats.dom)
		}

		if (this._onvisibilitychange) {
			document.removeEventListener('visibilitychange', this._onvisibilitychange)
		}

		if (this._onOriginMessage) {
			this.origin.removeEventListener('message', this._onOriginMessage)
		}

		this.ports.forEach((port) => this.stopListen(port))

		this.remoteShadows.forEach((remoteShadow) =>
			remoteShadow.port.addEventListener('message', remoteShadow.msgHandler)
		)

		this.ports = null
		this.listeners = null
		this.localShadows = null
		this.remoteShadows = null
		this.config = null
	}
}
