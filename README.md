# Timeline

时间线管理

## 基本使用

```javascript
const timeline = new Timeline({
    duration: Infinity, // 整个timeline的时长，超过后会停止或循环
    loop: false, // 结束后是否循环
    autoRecevery: true, // 是否自动回收结束的track轨道
})

timeline.play();

timeline.addTrack({
    startTime: timeline.currentTime + 500, // 开始时间
    duration: 1000, // 时长
    loop: false, // 是否循环
    onStart: (time) => {console.log('start')}, // 起始回调
    onEnd: (time) => {console.log('end')}, // 结束回调
    onUpdate: (time, p) => {console.log('update', time, p)}, // 更新回调
})
```


## 接口

### **TimeLine**

#### `constructor`

autoRecevery: false, // 是否自动回收结束的track轨道
loop: false, // 结束后是否循环
duration: Infinity, // 整个timeline的时长，超过后会停止或循环

#### methods

`play()`
开始播放

`stop()`
停止播放

`seek(time)`
时间定位

`recovery()`
回收无用的track

`addTrack(trackConfig)`
创建并添加一个轨道，详见Track

#### properties

currentTime: 当前时间
running： 是否在播放中
onEnd(setter): 播放完成的回调
tracks: 这个timeline中所有的track


### **Track**

id: undefined 方便debug
loop: false,  是否循环
startTime: 0, 开始时间
endTime,      结束时间
duration,     时长，duration和endTime输入一个即可
onStart,      起始回调，参数：time
onEnd,        终止回调，参数：time
onUpdate,     过程会掉，参数：time, p 其中p为该轨道当前进度(0~1)
onInit,       首次开始前的回调，无论loop与否都只会触发一次，


## 注意事项

- Timeline基于requestAnimationFrame，精度限制在raf的调用频率

- 由于(页面卡顿|用户来回切页面|轨道duration过短)等原因，可能会造成一些track的时间被整体跳过，timeline为了保证**最终结果正确**，依然会执行该track的所有回调(参数p=1)。



## TODO

- 应该增加选项，当标签页切走或者严重卡顿时自动停止计时，以免长时间切出后累计大量未执行track，切回来之后一次性执行导致长时间卡顿。

- 源码混乱

- 加入循环次数的处理

- 加入循环间隔的处理
