/**
 * @providesModule Scroll
 *
 * 这个组件就是包装了 ScrollView 但是秀就秀在会自动处理键盘遮挡输入
 * 用法上除了ref 其余跟 ScrollView 完全相同, 而且没有额外的设置
 *
 * 注意!! 将ScrollView 包装了起来, 因此, ref的获取需要通过
 * <Scroll
 *  ref={ ref => this.scrollview = (ref && ref.scrollViewRef) }
 * ></Scroll>
 * --------------
 * BIG BUG! 所以, 这个需要有能力获取到当前路由栈所在页面
 * 页面 A
 * <Scroll>
 *   <input type="text"/>
 * </Scroll>
 * 页面 B
 * <Scroll>
 *   <input type="text"/>
 * </Scroll>
 * 如果路由栈现在是 A->B 那么在B页面KBup的时候
 * TextInput.State.getCurrentFocusField()
 * 是 B 页面里的 input, 但是 A 页面事件 也在监听
 * 所以, ios 会有报错 如下
 * ... RCTTextField .... is not a descendant of <RCTxxxx
 */

/* eslint-disable react/sort-comp */
import React, { Component, PropTypes } from 'react';
import { ScrollView, TextInput, Keyboard, UIManager, findNodeHandle, Platform } from 'react-native';

const { State: InputState } = TextInput;
const isFunc = wt => typeof wt === 'function';

class Scroll extends Component {
  constructor(props) {
    super(props);

    this.state = {
      scrollContentPaddingBottom: 0,
    };

    this.nowOffsetY = 0;
    this.scrollViewRef = null;
  }

  componentWillMount() {
    // 这里用 DidShow 而不是 Will Show 是因为 Android 不支持
    Keyboard.addListener('keyboardDidShow', this.kbShowWatcher);
    Keyboard.addListener('keyboardDidHide', this.kbHideWatcher);
  }

  componentWillUnmount() {
    Keyboard.removeListener('keyboardDidShow', this.kbShowWatcher);
    Keyboard.removeListener('keyboardDidHide', this.kbHideWatcher);
  }


  /**
   * 获取元素相对父级(链?)元素的位置
   * @param targetHandleNodeOrInst 目标元素
   * @param targetParentHandleNodeOrInst 父级(链?)元素
   * @returns {Promise}
   */
  getRelativePos = (targetHandleNodeOrInst, targetParentHandleNodeOrInst) =>
    new Promise((resolve, reject) => {
      UIManager.measureLayout(
        findNodeHandle(targetHandleNodeOrInst),
        findNodeHandle(targetParentHandleNodeOrInst),
        reject,
        (x, y, width, height) => resolve({ x, y, width, height }),
      );
    })

  /**
   * 获取元素在屏幕上绝对位置
   * @param targetHandleNodeOrInst 目标元素
   * @returns {Promise}
   */
  getAbsolutePos = targetHandleNodeOrInst => new Promise((resolve) => {
    UIManager.measure(findNodeHandle(targetHandleNodeOrInst),
      (originX, originY, width, height, pageX, pageY) => {
        resolve({ originX, originY, width, height, pageX, pageY });
      });
  })

  kbShowWatcher = (e) => {
    const keyboardScreenY = e.endCoordinates.screenY;
    const focusedInputNodeHandle = InputState.currentlyFocusedField();
    if (!focusedInputNodeHandle || !keyboardScreenY) return;

    this.setState({ scrollContentPaddingBottom: keyboardScreenY }, () => {
      this.getAbsolutePos(focusedInputNodeHandle)
          .then((inputAbs) => {
            const { pageY: inputAbsY, height: inputHeight } = inputAbs;
            if (inputAbsY + inputHeight - 1 > keyboardScreenY) {
              if (this.scrollViewRef) {
                const scrollToY = this.nowOffsetY
                  + inputHeight
                  + this.props.offsetY
                  + (inputAbsY - keyboardScreenY);
                this.scrollViewRef.scrollTo({
                  x: 0,
                  y: scrollToY,
                  animated: false,
                });
                this.nowOffsetY = scrollToY;
              }
            }
          });
    });
  }

  kbHideWatcher = () => {
    this.setState({ scrollContentPaddingBottom: 0 });
  }


  onMomentumScrollEnd = (e) => {
    if (isFunc(this.props.onMomentumScrollEnd)) {
      this.props.onMomentumScrollEnd(e);
    }
    this.nowOffsetY = e.nativeEvent.contentOffset.y;
  }

  onScrollEndDrag = (e) => {
    if (isFunc(this.props.onMomentumScrollEnd)) {
      this.props.onMomentumScrollEnd(e);
    }
    this.nowOffsetY = e.nativeEvent.contentOffset.y;
  }

  onScrollAnimationEnd = (e) => {
    if (isFunc(this.props.onMomentumScrollEnd)) {
      this.props.onMomentumScrollEnd(e);
    }
    this.nowOffsetY = e.nativeEvent.contentOffset.y;
  }


  render() {
    const { keyboardDismissMode = 'on-drag' } = this.props;
    let custkeyboardDismissMode = keyboardDismissMode;
    if (custkeyboardDismissMode) {
      custkeyboardDismissMode = Platform.OS === 'android' ? 'none' : 'on-drag';
    }
    return (<ScrollView
      ref={(ref) => { this.scrollViewRef = ref; }}
      {...this.props}
      keyboardDismissMode={custkeyboardDismissMode}
      onScrollEndDrag={this.onScrollEndDrag}
      onScrollAnimationEnd={this.onScrollAnimationEnd}
      onMomentumScrollEnd={this.onMomentumScrollEnd}
      contentContainerStyle={{
        ...this.props.contentContainerStyle,
        paddingBottom: this.state.scrollContentPaddingBottom,
      }}
    />);
  }
}

Scroll.propTypes = {
  ...ScrollView.propTypes,
  /**
   * 键盘将输入框顶起来之后是否需要额外的量(输入法suggest栏)
   */
  offsetY: PropTypes.number,
};
Scroll.defaultProps = {
  ...ScrollView.defaultProps,
  offsetY: 0,
};

export default Scroll;
