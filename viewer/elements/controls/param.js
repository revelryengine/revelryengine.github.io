import { LitElement } from 'https://cdn.skypack.dev/lit-element@2.4.0';

export function getParams() {
  const [, match = ''] = window.location.hash.match(/\?(.*)/) || [];
  return new URLSearchParams(match);
}

export function setParams(params) {
  const state = getParams();
  for(const p in params) {
    state.set(p, params[p]);
  }
  history.replaceState({}, document.title,  window.location.hash.replace(/(\?|$).*/, '?' + state.toString()));
}

export class WebGLTFParamElement extends LitElement {
  connectedCallback(){
    super.connectedCallback();
    const props = this.constructor.properties;
    for(const [name, value] of getParams()){
      if(props[name] && props[name].param) {
        if(props[name].type === Boolean){
          this[name] = value === 'true' ;
        } else {
          this[name] = props[name].type(value);
        }
        
      }
    }
  }

  attributeChangedCallback(name, oldval, newval) {
    super.attributeChangedCallback(name, oldval, newval);

    const props = this.constructor.properties;
    if(props[name] && props[name].param) {
      if(props[name].type === Boolean){
        setParams({ [name]: newval !== undefined && newval !== null });
      } else {
        setParams({ [name]: newval });
      }
      
    }
  }
}

export default WebGLTFParamElement;
