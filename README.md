# Timeline

**A Timeline Controller with Superpower. For Events And Animations.**

- Wrap all your time-based events and animations into Tracks.
- Play, pause, time-travel, play-by-frame, replay, loop, rewind everything.
- Always get the predictable result.
- Monitor and control FPS elegantly.

动画与事件时间线管理器。

# Install

`npm i --save ani-timeline`

Support `browser`,`WebWorker`,`node.js`,`electron`,`webview`.

Made with typescript.

---

# Basic

```javascript
import Timeline from 'ani-timeline'

// 创建一个timeline实例
const timeline = new Timeline({
	duration: Infinity, // 整个timeline的时长，超过后会停止或循环
})

// 开始运行这个timeline
timeline.play()

// 添加一个track（动画轨道）
timeline.add({
	startTime: timeline.currentTime + 500, // 开始时间
	duration: 1000, // ms
	loop: false, // 是否循环
	onStart: () => {
		console.log('start')
	}, // 起始回调
	onEnd: () => {
		console.log('end')
	}, // 结束回调
	onUpdate: (time, percent) => {
		console.log('update', time, percent)
	}, // 更新回调
})
```

---

# Interfaces

## **Timeline**

### `constructor(options?: TimelineOptions)`

```typescript
interface TimelineOptions {
	/**
	 * how long is this timeline
	 *
	 * 整个时间线的时长，超出会停止或者循环
	 * @default Infinity
	 */
	duration: Infinity
	/**
	 * enable looping for timeline
	 *
	 * 时长到达后是否从头循环
	 * @default false
	 */
	loop: false
	/**
	 * automatically release dead tracks
	 *
	 * 如果时间线不停的运行而不回收过期的 track，会导致内存溢出，
	 * 如果时间线是循环的，track 加入一次之后再下一个循环仍要使用，则必须关掉该配置
	 * @default true
	 */
	autoRelease: true

	/**
	 * max time interval between frames, interval will be caped into this value
	 * - used to prevent big time jump after tab-change / process-sleep / break-point
	 *
	 * 最长帧时间限制，如果帧长度超过这个值，则会被压缩到这个值
	 * - 用于避免打断点或页面休眠后继续计时，恢复后时间突进
	 * @default 1000
	 * @unit ms
	 */
	maxStep: 1000

	/**
	 * max FPS
	 * @advice **it is VERY recommended to set a reasonable fps cap**
	 * - 🌲🌲🌲 to save power from unnecessary redraws 🌲🌲🌲
	 * - to prevent wired behaviors on high refresh rate devices (like crazy fast animations on 300hz screens)
	 * - to prevent heating on mobile devices
	 *
	 * @advice If the device failed to render at stable 60fps.
	 *          You should cap it to a stable 30 fps rather than let it dither around 30~60 fps.
	 *          It will provide much more comfortable interaction that feel smooth and predictable for fingers and eyes.
	 *
	 * @note You can change this value any time by {@link Timeline.updateMaxFPS}
	 * @note this only cap the max fps. actual fps is very much related to the underlying runtime
	 * @note use `common divisors` like 60/30/20 instead of 24/25/40/50
	 *
	 * 最大帧率限制，用于节约计算性能
	 * 建议在无法稳定 60 fps 运行的机器上，将 fps 锁定在 30/20/10
	 * @suggestion 多数场景中，稳定的低帧率，流畅性高于不稳定的高帧率
	 * @default Infinity
	 */
	maxFPS: Infinity

	// TODO fixme
	// 是否假设每两次requestAnimationFrame之间的间隔是相同的
	// fixStep: null,

	/**
	 * Open FPS Stats Panel
	 *
	 * 开启性能计数器面板
	 * @warning 基于 canvas 接口，不要再没有 dom 接口的环境中开启该功能
	 * @requires DOM
	 * @default false
	 */
	openStats: false

	/**
	 * Decay of fps measurement
	 */
	recordFPSDecay: 0.5

	/**
	 * handler for all the errors thrown from tracks' callback functions
	 * - if provided.
	 *     - all errors will be caught and passed to this function.
	 *     - timeline will keep running **unless** this function returns true
	 * - if not provided.
	 *     - any error thrown from tracks will be thrown to global scope
	 *     - timeline will stop immediately
	 */
	onError?: (error: Error) => void | true
}
```

### methods

```typescript
/**
 * fire one tick
 * @note will use this.currentTime as current time
 * @note if you want to tick a specific time, call .seek before this
 */
tick(): this

/**
 * start play this timeline.
 * @note if timeline already started, calling play again will make it start from beginning.
 */
play(): this

/**
 * jump to a specific time, used to manipulate timeline
 * @note this will change the reference time of this timeline
 * @note it is safe to call this on a playing timeline
 */
seek(time: number): this

/**
 * stop playing
 */
stop(): this

/**
 * pause playing
 */
pause(): this

/**
 * restore playing from pause or stop
 */
resume(): this

/**
 * update FPS cap dynamically at runtime
 */
updateMaxFPS(maxFPS: number)

/**
 * stop all tracks and destroy this timeline
 * @note destroyed timeline can not be used or restored again
 */
dispose()

/**
 * Add a track
 *
 * 根据配置创建一个Track
 */
add(track: Track | TrackOptions): Track
addTrack(track: Track | TrackOptions): Track // @deprecated use add

/**
 * Get all tracks that have a certain .id
 *
 * 根据ID获取Tracks
 */
getTracksByID(id: string | number | undefined): Array<Track>

/**
 * Stop a track
 *
 * 停止一个track，并标记这个track可被清理
 */
stopTrack(track: Track)

/**
 * Remove a track
 */
remove(track: Track)

/**
 * Native-like APIs are provided on the Timeline instance.
 * So that these callbacks can sync with other tracks on timeline.
 *
 * These method will create tracks to simulate native timers.
 *
 * @note Using both timeline and native timer APIs for related logics will cause problems.
 *       Because native timers don't pause or rewind when timeline does.
 *       It is recommended to use these for timeline related logics.
 *
 * **以下接口行为与 DOM 标准保持一致，但是全部与 timeline 中的时间和行为对齐**
 */

setTimeout(callback: () => void, time = 10): number

setInterval(callback: () => void, time = 10): number

clearTimeout(ID: number)

clearInterval(ID: number)

```

### properties

````typescript
interface Timeline {
    /**
     * type identifier
     */
    readonly isTimeline = true
    readonly isTrackGroup = true

    /**
     * duration of this timeline.
     * @readonly
     * ```
     * if loop
     *     'timeline will start from beginning'
     * else
     *     'timeline will stop'
     * ```
     */
    readonly duration: number

    /**
     * loop this timeline
     * @readonly
     */
    readonly loop: boolean

    /**
     * is this playing (started and not yet ended or paused, next frame will be automatically fired)
     * @readonly
     */
    readonly playing: boolean

    /**
     * current time for this timeline.
     * @note currentTime ∈ [0, duration]
     * @readonly
     */
    readonly currentTime: number

    /**
     * auto calculated fps
     * @readonly
     */
    readonly fps = 0
}
````

## **Track**

A track is a time range that can be added to a timeline. It represents a sequence of events or a continuous animation. A track has its own startTime, endTime, loop, and a series of hooks.

一个 track（轨道）是时间线上的一段区间，代表一段动画或着时间相关的事件。每个 track 有自己的起止时间、循环设置和钩子函数。

<img src="https://img.alicdn.com/tfs/TB1yL.4ebGYBuNjy0FoXXciBFXa-2382-482.png" width=1000px>

```typescript
/**
 * Usage
 */
const track = new Track(options: TrackOptions)

/**
 * construction options
 */
interface TrackOptions {
    /**
     * 命名，可以用来查找制定Track，也便与调试
     * - used to identify a track. specify this if you want to get tracks by id
     */
    id?: number | string
    loop?: boolean
    /**
     * when to start this track
     * @default currentTime of the parent timeline
     */
    startTime?: number
    /**
     * when to end this track
     * @note use endTime or duration, not both
     * @note if neither endTime or duration are input, duration will be set as Infinity
     */
    endTime?: number
    /**
     * how long is this track
     * @note use endTime or duration, not both
     * @note if neither endTime or duration are input, duration will be set as Infinity
     */
    duration?: number
    /**
     * callback for start (including every loop)
     */
    onStart?: () => void
    /**
     * callback for end (including every loop)
     */
    onEnd?: () => void
    /**
     * callback for every tick (including start and end)
     */
    onUpdate?: (
        /**
         * local current time when this happen
         * @note ∈ loop ? [startTime, endTime) : [startTime, endTime]
         */
        currentTime: number,
        /**
         * percent of this track
         * @note ∈ loop ? [0,1) ]: [0,1]
         * @note if a easing function is provided, this value will be eased
         */
        percent: number
    ) => void
    /**
     * callback for init (call once before first start)
     * @note use this to clean up and initialize a loop track or track on a loop timeline
     * @note every time timeline loop back before track, this will be called
     */
    onInit?: () => void
    /**
     * easing function (percent => easedPercent)
     * @node input ∈ [0,1]
     * @node output ∈ [0,1]
     * @note easing(0) == 0
     * @note easing(1) == 1
     * @note must be monotonically non-decreasing
     */
    easing?: EasingFunction
}

/**
 * Properties
 */
interface {
    id: number | string | undefined
    isTrack: true

    /**
     * set track.alive false to stop it immediately and mark it disposable.
     */
    alive = true

    readonly loop: boolean

      /**
     * this track has started and not yet ended
     * @note always set .started true before set .running true
     * @note if running true, started must be true
     * @note running false but started true, means that this track has ended
     */
    running : boolean // 运行中

    /**
     * has this track been inited
     */
    inited : boolean // 初始化完成

    /**
     * has this track been started
     */
    started : boolean // 本轮播放过

    /**
     * which cycle of the loop (循环次数)
     */
    iteration : number

    /**
     * whether this track is expired (是否已过期)
     */
    get expired() {
        return this.started && !this.running
    }

    onStart: TrackOptions['onStart']
    onEnd: TrackOptions['onEnd']
    onUpdate: TrackOptions['onUpdate']
    onInit: TrackOptions['onInit']

}
```

---

# Performance

根据 benchmark（demo/benchmark.html），Timeline 中放入 100,000 个 track 时的**自身性能消耗**（所有回调函数设为空函数）为 `每帧2ms`。

该组件不太可能成为性能瓶颈。

根据`@polaris.gl`的 benchmark 结果，相同功能下，Timeline 的自身性能消耗小于 Tween.

# Cautions!

- Keep in mind that time is **discrete**.

- Avoid dependence between tracks. If events of different tracks are triggered in the same tick. They will be called in the order of being added to the timeline.

That means in the following condition:

```
         |                                      [trackA============]      |added_first
         |                [trackB===================]                     |added_second
timeline |----------------------------------------------------------------|
             ^previous_tick                                     ^current_tick
```

The callback order will be:

```
- trackA.onStart()
- trackA.onUpdate(currentTime)
- trackB.onStart()
- trackB.onUpdate(trackB.endTime, 1) // this is to make sure ended tracks are at right states
- trackB.onEnd()
```

> CN: 应避免 Track 之前相互依赖，如果多个 Track 被跳过，Timeline 将按照 Track 被 add 的顺序依次处理，无法保证不同 Track 之间时间点的顺序正确

- `Timeline` with _`l`_ not _`L`_ , not `TimeLine`

- Timeline 基于 requestAnimationFrame，精度限制在 raf 的调用频率，通常为 16ms 或 32ms

- 由于(页面卡顿|用户来回切页面|轨道 duration 过短)等原因，可能会造成一些 track 的时间被整体跳过，timeline 为了保证**最终结果正确**，依然会执行该 track 的所有回调。即：每个 track 的所有回调至少都会被调用一次，来保证最终结果的正确。

- DO NOT RELY ON `visibilitychange` and `document.hidden`. They will break in the following cases:
  - Old version browsers. 一些老版浏览器中未实现这些接口
  - Any webview related runtime including electron. 在一些 webview 实现中(包括 electron )该接口的行为不符合 DOM 标准
  - visibilitychange will break if you entered break point. 在 Chrome devtool 中进入断点之后，所有的 visibilitychange 事件都会丢失

# Work with tween.js

```javascript
timeline.addTrack({
	duration: 5000,
	onUpdate: (t, p) => {
		p = TWEEN.Easing.Quadratic.InOut(p)
		div.style.left = `${1000 * p}px`
	},
})

// or

timeline.addTrack({
	duration: 5000,
	easing: TWEEN.Easing.Quadratic.InOut,
	onUpdate: (t, p) => {
		div.style.left = `${1000 * p}px`
	},
})
```

# Work with web workers

refactoring...
