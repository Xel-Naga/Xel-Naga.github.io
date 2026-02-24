/**
 * 时间系统
 * 负责管理游戏内时间的流逝和日期变更
 */

export class TimeSystem {
    constructor(game) {
        this.game = game;
        this.timeUpdateInterval = null;
    }

    /**
     * 初始化时间系统
     */
    init() {
        console.log('初始化时间系统...');
        this.startTimeUpdates();
    }

    /**
     * 开始时间更新
     */
    startTimeUpdates() {
        // 每分钟更新一次游戏时间（现实时间10秒对应游戏时间1分钟）
        this.timeUpdateInterval = setInterval(() => {
            this.updateGameTime();
        }, 10000); // 10秒
    }

    /**
     * 停止时间更新
     */
    stopTimeUpdates() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
            this.timeUpdateInterval = null;
        }
    }

    /**
     * 更新游戏时间
     */
    updateGameTime() {
        const worldState = this.game.gameState.getWorldState();
        let [hours, minutes] = worldState.time.split(':').map(Number);

        // 增加1分钟
        minutes += 1;

        // 处理分钟进位
        if (minutes >= 60) {
            minutes = 0;
            hours += 1;
        }

        // 处理小时进位（24小时制）
        if (hours >= 24) {
            hours = 0;
            // 日期增加一天
            this.advanceDate();
        }

        // 更新时间
        const newTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        this.game.gameState.setCurrentTime(newTime);

        // 更新UI
        this.game.uiRenderer.updateGameInfo();

        // 检查时间触发的事件
        this.checkTimeTriggers(newTime);

        // 触发事件
        this.game.eventSystem.emit('time:updated', {
            time: newTime,
            date: worldState.date
        });
    }

    /**
     * 推进日期
     */
    advanceDate() {
        const worldState = this.game.gameState.getWorldState();
        const date = new Date(worldState.date);

        // 增加一天
        date.setDate(date.getDate() + 1);

        // 更新日期
        const newDate = date.toISOString().split('T')[0];
        this.game.gameState.setCurrentDate(newDate);

        // 触发事件
        this.game.eventSystem.emit('date:advanced', {
            oldDate: worldState.date,
            newDate: newDate
        });
    }

    /**
     * 推进指定时间
     * @param {number} minutes - 要推进的分钟数
     */
    advanceTime(minutes) {
        if (minutes <= 0) return;

        const worldState = this.game.gameState.getWorldState();
        let [hours, currentMinutes] = worldState.time.split(':').map(Number);

        // 计算总分钟数
        let totalMinutes = hours * 60 + currentMinutes + minutes;

        // 计算新的时间和日期
        let daysToAdd = Math.floor(totalMinutes / (24 * 60));
        totalMinutes %= (24 * 60);

        const newHours = Math.floor(totalMinutes / 60);
        const newMinutes = totalMinutes % 60;
        const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;

        // 更新时间
        this.game.gameState.setCurrentTime(newTime);

        // 推进日期
        if (daysToAdd > 0) {
            for (let i = 0; i < daysToAdd; i++) {
                this.advanceDate();
            }
        }

        // 更新UI
        this.game.uiRenderer.updateGameInfo();

        // 检查时间触发的事件
        this.checkTimeTriggers(newTime);

        // 触发事件
        this.game.eventSystem.emit('time:advanced', {
            minutes: minutes,
            newTime: newTime,
            daysAdded: daysToAdd
        });
    }

    /**
     * 检查时间触发的事件
     * @param {string} currentTime - 当前时间
     */
    checkTimeTriggers(currentTime) {
        const events = this.game.dataLoader.getEvents();
        if (!events) return;

        const worldState = this.game.gameState.getWorldState();

        events.forEach(event => {
            // 检查时间触发条件
            if (event.trigger_type === 'time' && event.trigger_time === currentTime) {
                // 检查是否已触发
                if (!worldState.triggeredEvents.has(event.id)) {
                    this.triggerTimeEvent(event);
                }
            }
        });
    }

    /**
     * 触发时间事件
     * @param {Object} event - 事件对象
     */
    triggerTimeEvent(event) {
        console.log(`触发时间事件: ${event.id} - ${event.title}`);

        // 标记为已触发
        const worldState = this.game.gameState.getWorldState();
        worldState.triggeredEvents.add(event.id);

        // 执行事件效果
        this.executeTimeEventEffects(event);

        // 显示事件消息
        if (event.message) {
            this.game.uiRenderer.addFeedback('系统', event.message, 'info');
        }

        // 触发事件
        this.game.eventSystem.emit('time:event:triggered', {
            eventId: event.id,
            event: event,
            time: worldState.time
        });
    }

    /**
     * 执行时间事件效果
     * @param {Object} event - 事件对象
     */
    executeTimeEventEffects(event) {
        if (!event.effects) return;

        // 天气变化
        if (event.effects.weather_change) {
            this.game.gameState.setCurrentWeather(event.effects.weather_change);
            this.game.uiRenderer.addFeedback('系统', `天气变为: ${event.effects.weather_change}`, 'info');
        }

        // 状态变化
        if (event.effects.status_changes) {
            event.effects.status_changes.forEach(change => {
                switch (change.type) {
                    case 'stamina':
                        if (change.amount > 0) {
                            this.game.statusManager.restoreStamina(change.amount, '时间事件');
                        } else {
                            this.game.statusManager.consumeStamina(-change.amount, '时间事件');
                        }
                        break;
                    case 'sanity':
                        if (change.amount > 0) {
                            this.game.statusManager.restoreSanity(change.amount, '时间事件');
                        } else {
                            this.game.statusManager.consumeSanity(-change.amount, '时间事件');
                        }
                        break;
                    case 'temperature':
                        this.game.statusManager.changeTemperature(change.amount, '时间事件');
                        break;
                }
            });
        }

        // 触发任务
        if (event.effects.quest_triggers) {
            event.effects.quest_triggers.forEach(questId => {
                this.game.gameState.startQuest(questId);
                this.game.uiRenderer.addFeedback('系统', `新任务: ${questId}`, 'quest');
            });
        }

        // 设置标志
        if (event.effects.flag_set) {
            event.effects.flag_set.forEach(flag => {
                this.game.gameState.setFlag(flag);
            });
        }
    }

    /**
     * 获取当前时间信息
     * @returns {Object} 时间信息
     */
    getCurrentTimeInfo() {
        const worldState = this.game.gameState.getWorldState();
        const [hours, minutes] = worldState.time.split(':').map(Number);

        return {
            time: worldState.time,
            date: worldState.date,
            hours: hours,
            minutes: minutes,
            totalMinutes: hours * 60 + minutes,
            period: this.getTimePeriod(hours)
        };
    }

    /**
     * 获取时间段
     * @param {number} hours - 小时
     * @returns {string} 时间段
     */
    getTimePeriod(hours) {
        if (hours >= 5 && hours < 12) return '早晨';
        if (hours >= 12 && hours < 14) return '中午';
        if (hours >= 14 && hours < 18) return '下午';
        if (hours >= 18 && hours < 22) return '晚上';
        return '深夜';
    }

    /**
     * 获取时间显示文本
     * @returns {string} 时间显示文本
     */
    getTimeDisplayText() {
        const timeInfo = this.getCurrentTimeInfo();
        const period = this.getTimePeriod(timeInfo.hours);

        return `${timeInfo.date} ${period} ${timeInfo.time}`;
    }

    /**
     * 检查是否为特定时间
     * @param {string} targetTime - 目标时间 (HH:MM)
     * @returns {boolean} 是否为该时间
     */
    isTime(targetTime) {
        const currentTime = this.game.gameState.getWorldState().time;
        return currentTime === targetTime;
    }

    /**
     * 检查是否在时间范围内
     * @param {string} startTime - 开始时间 (HH:MM)
     * @param {string} endTime - 结束时间 (HH:MM)
     * @returns {boolean} 是否在时间范围内
     */
    isTimeBetween(startTime, endTime) {
        const currentTime = this.game.gameState.getWorldState().time;
        return currentTime >= startTime && currentTime <= endTime;
    }

    /**
     * 获取到目标时间的剩余分钟数
     * @param {string} targetTime - 目标时间 (HH:MM)
     * @returns {number} 剩余分钟数
     */
    getMinutesUntil(targetTime) {
        const currentTime = this.game.gameState.getWorldState().time;
        const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
        const [targetHours, targetMinutes] = targetTime.split(':').map(Number);

        const currentTotal = currentHours * 60 + currentMinutes;
        const targetTotal = targetHours * 60 + targetMinutes;

        if (targetTotal >= currentTotal) {
            return targetTotal - currentTotal;
        } else {
            // 跨天计算
            return (24 * 60 - currentTotal) + targetTotal;
        }
    }

    /**
     * 设置时间（用于调试或特殊事件）
     * @param {string} time - 时间 (HH:MM)
     * @param {string} reason - 设置原因
     */
    setTime(time, reason = '未知') {
        const oldTime = this.game.gameState.getWorldState().time;
        this.game.gameState.setCurrentTime(time);

        // 更新UI
        this.game.uiRenderer.updateGameInfo();

        // 触发事件
        this.game.eventSystem.emit('time:set', {
            oldTime: oldTime,
            newTime: time,
            reason: reason
        });
    }

    /**
     * 设置日期（用于调试或特殊事件）
     * @param {string} date - 日期 (YYYY-MM-DD)
     * @param {string} reason - 设置原因
     */
    setDate(date, reason = '未知') {
        const oldDate = this.game.gameState.getWorldState().date;
        this.game.gameState.setCurrentDate(date);

        // 触发事件
        this.game.eventSystem.emit('date:set', {
            oldDate: oldDate,
            newDate: date,
            reason: reason
        });
    }

    /**
     * 暂停时间更新
     */
    pause() {
        this.stopTimeUpdates();
    }

    /**
     * 恢复时间更新
     */
    resume() {
        this.startTimeUpdates();
    }

    /**
     * 获取时间流逝速度
     * @returns {number} 时间流逝速度（现实秒数/游戏分钟）
     */
    getTimeSpeed() {
        return 10; // 10现实秒 = 1游戏分钟
    }

    /**
     * 设置时间流逝速度
     * @param {number} speed - 时间流逝速度（现实秒数/游戏分钟）
     */
    setTimeSpeed(speed) {
        this.stopTimeUpdates();
        this.timeUpdateInterval = setInterval(() => {
            this.updateGameTime();
        }, speed * 1000);
    }
}