import { ScrollView, TextInput, Keyboard, UIManager, findNodeHandle } from 'react-native';

const { State: InputState } = TextInput;

class SScrollView extends ScrollView {
  nowOffsetY = 0;
  beforeKBShowOffsetY = 0;
  componentWillMount(...args) {
    super.componentWillMount(...args);
    // 这里用 DidShow 而不是 Will Show 是因为 Android 不支持
    Keyboard.addListener('keyboardDidShow', this.kbShowWatcher);
    Keyboard.addListener('keyboardDidHide', this.kbHideWatcher);
  }
  componentWillUnmount(...args) {
    super.componentWillUnmount(...args);
    Keyboard.removeListener('keyboardDidShow', this.kbShowWatcher);
    Keyboard.removeListener('keyboardDidHide', this.kbHideWatcher);
  }

  getRelativePos = (targetHandleNodeOrInst, targetParentHandleNodeOrInst) =>
    new Promise((resolve, reject) => {
      UIManager.measureLayout(
        findNodeHandle(targetHandleNodeOrInst),
        findNodeHandle(targetParentHandleNodeOrInst),
        reject,
        (x, y, width, height) => resolve({ x, y, width, height }),
      );
    })

  getAbsolutePos = targetHandleNodeOrInst => new Promise((resolve) => {
    UIManager.measure(findNodeHandle(targetHandleNodeOrInst),
      (originX, originY, width, height, pageX, pageY) => {
        resolve({ originX, originY, width, height, pageX, pageY });
      });
  })

  _handleScroll = (e) => {
    const nativeEvent = e.nativeEvent;
    this.nowOffsetY = nativeEvent.contentOffset.y;
    super._handleScroll(e); // eslint-disable-line
  }


  kbShowWatcher = (e) => {
    const keyboardScreenY = e.endCoordinates.screenY;
    const focusedInputNodeHandle = InputState.currentlyFocusedField();
    if (!focusedInputNodeHandle || !keyboardScreenY) return;
    this.getAbsolutePos(focusedInputNodeHandle)
      .then((inputAbs) => {
        this.getAbsolutePos(this).then((svAbs) => {
          const { pageY: inputAbsY, height: inputHeight } = inputAbs;
          const { pageY: svAbsY } = svAbs;
          if (inputAbsY + inputHeight > keyboardScreenY) {
            this.getRelativePos(focusedInputNodeHandle, this)
            .then((inputRelaPos) => {
              this.beforeKBShowOffsetY = this.nowOffsetY;
              const { y: inputYRelativeSV } = inputRelaPos;
              const offsetY = (inputYRelativeSV + svAbsY + inputHeight + 20) - keyboardScreenY;
              this.scrollTo({ x: 0, y: offsetY, animated: true });
            })
            .catch(ee => console.log(ee));
          }
        });
      });
  }

  kbHideWatcher = () => {
    if (
      !this.props.keyboardShouldPersistTaps &&
      (this.beforeKBShowOffsetY === 0 || this.beforeKBShowOffsetY)
    ) {
      this.scrollTo({ x: 0, y: this.beforeKBShowOffsetY, animated: true });
    }
  }
}

export default SScrollView;
