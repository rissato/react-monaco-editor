import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import * as React from "react";
import { useEffect, useMemo, useRef } from "react";
import { MonacoEditorProps } from "./types";
import { processSize } from "./utils";

function MonacoEditor(
  {
    width,
    height,
    value,
    defaultValue,
    language,
    theme,
    options,
    overrideServices,
    editorWillMount,
    editorDidMount,
    editorWillUnmount,
    onChange,
    className,
    uri,
  }: MonacoEditorProps,
  ref: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>,
) {
  const containerElement = useRef<HTMLDivElement | null>(null);

  // const editor = ref?ref:useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const _subscription = useRef<monaco.IDisposable | null>(null);

  const __prevent_trigger_change_event = useRef<boolean | null>(null);

  const fixedWidth = processSize(width);

  const fixedHeight = processSize(height);

  const style = useMemo(
    () => ({
      width: fixedWidth,
      height: fixedHeight,
    }),
    [fixedWidth, fixedHeight],
  );

  const handleEditorWillMount = () => {
    const finalOptions = editorWillMount(monaco);
    return finalOptions || {};
  };

  const handleEditorDidMount = () => {
    editorDidMount(ref.current, monaco);

    _subscription.current = ref.current.onDidChangeModelContent((event) => {
      if (!__prevent_trigger_change_event.current) {
        onChange(ref.current.getValue(), event);
      }
    });
  };

  const handleEditorWillUnmount = () => {
    editorWillUnmount(ref.current, monaco);
  };

  const initMonaco = () => {
    const finalValue = value !== null ? value : defaultValue;

    if (containerElement.current) {
      // Before initializing monaco editor
      const finalOptions = { ...options, ...handleEditorWillMount() };
      const modelUri = uri?.(monaco);
      let model = modelUri && monaco.editor.getModel(modelUri);
      if (model) {
        // Cannot create two models with the same URI,
        // if model with the given URI is already created, just update it.
        model.setValue(finalValue);
        monaco.editor.setModelLanguage(model, language);
      } else {
        model = monaco.editor.createModel(finalValue, language, modelUri);
      }

      // eslint-disable-next-line no-param-reassign
      ref.current = monaco.editor.create(
        containerElement.current,
        {
          model,
          ...(className ? { extraEditorClassName: className } : {}),
          ...finalOptions,
          ...(theme ? { theme } : {}),
        },
        overrideServices,
      );
      // After initializing monaco editor
      handleEditorDidMount();
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(initMonaco, []);

  useEffect(() => {
    if (ref.current) {
      if (value === ref.current.getValue()) {
        return;
      }

      const model = ref.current.getModel();
      __prevent_trigger_change_event.current = true;
      ref.current.pushUndoStop();
      // pushEditOperations says it expects a cursorComputer, but doesn't seem to need one.
      model.pushEditOperations(
        [],
        [
          {
            range: model.getFullModelRange(),
            text: value,
          },
        ],
        undefined,
      );
      ref.current.pushUndoStop();
      __prevent_trigger_change_event.current = false;
    }
  }, [value]);

  useEffect(() => {
    if (ref.current) {
      const model = ref.current.getModel();
      monaco.editor.setModelLanguage(model, language);
    }
  }, [language]);

  useEffect(() => {
    if (ref.current) {
      // Don't pass in the model on update because monaco crashes if we pass the model
      // a second time. See https://github.com/microsoft/monaco-editor/issues/2027
      const { model: _model, ...optionsWithoutModel } = options;
      ref.current.updateOptions({
        ...(className ? { extraEditorClassName: className } : {}),
        ...optionsWithoutModel,
      });
    }
  }, [className, options]);

  useEffect(() => {
    if (ref.current) {
      ref.current.layout();
    }
  }, [width, height]);

  useEffect(() => {
    monaco.editor.setTheme(theme);
  }, [theme]);

  useEffect(
    () => () => {
      if (ref.current) {
        handleEditorWillUnmount();
        ref.current.dispose();

        const model = ref.current.getModel();
        if (model) {
          model.dispose();
        }
      }
      if (_subscription.current) {
        _subscription.current.dispose();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div
      ref={containerElement}
      style={style}
      className="react-monaco-editor-container"
    />
  );
}

// MonacoEditor.defaultProps = {
//   width: "100%",
//   height: "100%",
//   value: null,
//   defaultValue: "",
//   language: "javascript",
//   theme: null,
//   options: {},
//   overrideServices: {},
//   editorWillMount: noop,
//   editorDidMount: noop,
//   editorWillUnmount: noop,
//   onChange: noop,
//   className: null,
// };

MonacoEditor.displayName = "MonacoEditor";

export default React.forwardRef(MonacoEditor);
