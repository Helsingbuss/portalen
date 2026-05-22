import React from "react";

export const View = (props: any) => React.createElement("div", props, props.children);
export const Text = (props: any) => React.createElement("span", props, props.children);
export const Pressable = (props: any) => React.createElement("button", props, props.children);
export const Modal = (props: any) => props.visible ? React.createElement("div", props, props.children) : null;
export const ScrollView = (props: any) => React.createElement("div", props, props.children);
export const Image = (props: any) => React.createElement("img", props);
export const TextInput = (props: any) => React.createElement("input", props);

export const StyleSheet = {
  create: (styles: any) => styles,
};

export const Platform = {
  OS: "web",
  select: (options: any) => options?.web ?? options?.default,
};

export default {};
