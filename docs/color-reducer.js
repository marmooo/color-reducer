class UniformQuantization{imageData;constructor(e){this.imageData=e}getReplaceColors(e){const t=Math.floor(Math.cbrt(e)),o=new Array(t**3),n=256/t,s=n/2;let i=0;for(let e=0;e<t;e++)for(let a=0;a<t;a++)for(let r=0;r<t;r++){const c=Math.round(n*e+s),l=Math.round(n*a+s),d=Math.round(n*r+s);o[i]=(d*256+l)*256+c,i++}return o}getIndexedImage(e){const{imageData:n}=this,t=Math.floor(Math.cbrt(e)),a=new Uint32Array(n.data.buffer),s=n.width*n.height,i=t<7?new Uint8Array(s):new Uint16Array(s),o=256/t;for(let e=0;e<s;e++){const n=a[e],r=n>>16&255,c=n>>8&255,l=n&255,d=Math.floor(l/o),u=Math.floor(c/o),h=Math.floor(r/o);i[e]=(h*t+u)*t+d}return new Uint8Array(i.buffer)}apply(e){const{imageData:o}=this,a=Math.floor(Math.cbrt(e)),t=256/a,i=t/2,n=o.data,s=new Uint8ClampedArray(n.length);for(let e=0;e<n.length;e+=4){const o=e+1,a=e+2,r=e+3;s[e]=Math.round(Math.floor(n[e]/t)*t+i),s[o]=Math.round(Math.floor(n[o]/t)*t+i),s[a]=Math.round(Math.floor(n[a]/t)*t+i),s[r]=n[r]}return new ImageData(s,o.width,o.height)}}export{UniformQuantization as UniformQuantization};class OctreeNode{level;colors=[];total=0;constructor(e){this.level=e}}class OctreeLog{cubeIndex;numLeaves;constructor(e,t){this.cubeIndex=e,this.numLeaves=t}}class OctreeQuantization{imageData;cubes;replaceColors=[];colorMapping=new Uint8Array;splitLogs=[];constructor(e){this.imageData=e,this.cubes=this.initCubes()}getKey(e,t){const n=(e>>16+t&1)<<2,s=(e>>8+t&1)<<1,o=e>>t&1;return n|s|o}initCubes(){const{imageData:o}=this,n=new Uint32Array(o.data.buffer),t=new Uint32Array(16777216);for(let e=0;e<n.length;e++){const s=n[e],o=s&16777215;t[o]++}const i=7,e=new Array(8);for(let t=0;t<e.length;t++)e[t]=new OctreeNode(i);for(let n=0;n<t.length;n++){const s=t[n];if(s){const o=this.getKey(n,7),t=e[o];t.colors.push([n,s]),t.total+=s}}const s=e.filter(e=>e.total>0);return this.splitLogs=[new OctreeLog(0,s.length)],s}splitCubes(e,t){const{splitLogs:n}=this;for(;e.length<t;){let i=0,a=e[0].total;for(let t=1;t<e.length;t++){const n=e[t],s=n.total;a<s&&n.level!==0&&(i=t,a=s)}const o=e[i];if(o.total===1)break;if(o.colors.length===1)break;const r=o.level-1;let s=new Array(8);for(let e=0;e<s.length;e++)s[e]=new OctreeNode(r);for(let e=0;e<o.colors.length;e++){const[t,n]=o.colors[e],a=this.getKey(t,r),i=s[a];i.colors.push([t,n]),i.total+=n}if(s=s.filter(e=>e.total>0),e.length+s.length-1<=t){e.splice(i,1,...s);const t=new OctreeLog(i,s.length);n.push(t)}else break}return e}mergeCubes(e,t){const{splitLogs:n}=this;let s=n.length-1;for(;t<e.length;){const{cubeIndex:o,numLeaves:i}=n[s],t=e[o];for(let n=1;n<i;n++){const s=e[o+n];t.colors.push(...s.colors),t.total+=s.total}t.level++,e.splice(o,i,t),s--}return this.splitLogs=n.slice(0,s+1),e}getReplaceColors(e){const t=e.length<=256?new Uint8Array(16777216):new Uint16Array(16777216),n=new Array(e.length);for(let s=0;s<e.length;s++){const i=e[s].colors;let a=0,r=0,c=0,o=0;for(let l=0;l<i.length;l++){const[e,n]=i[l],d=e>>16&255,u=e>>8&255,h=e&255;a+=h*n,r+=u*n,c+=d*n,o+=n,t[e]=s}const l=Math.round(a/o),d=Math.round(r/o),u=Math.round(c/o),h=(u*256+d)*256+l;n[s]=h}return this.colorMapping=new Uint8Array(t.buffer),n}getIndexedImage(){const{imageData:e,replaceColors:o,colorMapping:n}=this;if(n===void 0)throw new Error("colorMapping is not initialized");const i=new Uint32Array(e.data.buffer),t=e.width*e.height,s=o.length<=256?new Uint8Array(t):new Uint16Array(t);for(let e=0;e<t;e++){const o=i[e],a=o&16777215;s[e]=n[a]}return s}apply(e){const{imageData:n}=this;let{cubes:t}=this;t=e<t.length?this.mergeCubes(t,e):this.splitCubes(t,e),this.cubes=t;const o=this.getReplaceColors(t);this.replaceColors=o;const a=t.length<=256?this.colorMapping:new Uint16Array(this.colorMapping.buffer),s=new Uint32Array(n.data.buffer),i=new Uint32Array(s.length);for(let e=0;e<s.length;e++){const t=s[e],n=t&16777215,r=o[a[n]];i[e]=r|t&4278190080}const r=new Uint8ClampedArray(i.buffer);return new ImageData(r,n.width,n.height)}}export{OctreeNode as OctreeNode};export{OctreeLog as OctreeLog};export{OctreeQuantization as OctreeQuantization};const InitialChannel=-1,R=0,G=1,B=2;class Cube{colors;sortChannel;mainChannel;total;constructor(e,t){this.colors=e,this.sortChannel=t;const n=this.getColorStats(this.colors),[s,o,i,a]=n;this.mainChannel=this.getDominantChannel(s,o,i),this.total=a}getDominantChannel(e,t,n){return e>t&&e>n?0:t>e&&t>n?1:n>e&&n>t?2:1}getColorStats(e){let r=0,t=0,n=0,s=0,o=255,i=255,a=255;for(let c=0;c<e.length;c++){const[l,d,u,h]=e[c];t=Math.max(t,l),n=Math.max(n,d),s=Math.max(s,u),o=Math.min(o,l),i=Math.min(i,d),a=Math.min(a,u),r+=h}const c=t-o,l=n-i,d=s-a;return[c,l,d,r]}}class MedianCut{imageData;options;colors;cubes;replaceColors=[];colorMapping=new Uint8Array;splitLogs=[];static defaultOptions={cache:!0};constructor(e,t=MedianCut.defaultOptions){this.imageData=e,this.options=t,this.colors=this.getColors(),this.cubes=this.initCubes()}initCubes(){return[new Cube(this.colors,InitialChannel)]}getColors(){const{imageData:s}=this,t=new Uint32Array(s.data.buffer),e=new Uint32Array(16777216);for(let n=0;n<t.length;n++){const s=t[n],o=s&16777215;e[o]++}const n=[];for(let t=0;t<e.length;t++){const s=e[t];if(s>0){const e=t>>16&255,o=t>>8&255,i=t&255;n.push([i,o,e,s])}}return n}unstableBucketSort(e,t){const n=new Array(256);for(let e=0;e<256;e++)n[e]=[];for(let s=0;s<e.length;s++){const o=e[s];n[o[t]].push(o)}return n}stableBucketSort(e,t){const s=this.unstableBucketSort(e,t),n=(t+1)%3,o=(t+2)%3;for(let e=0;e<256;e++)s[e].sort((e,t)=>e[n]!==t[n]?e[n]-t[n]:e[o]-t[o]);return s}splitBuckets(e,t){const n=[],s=[];let o=0;for(let i=0;i<256;i++){const a=e[i],r=a.length;if(o+r<=t)n.push(...a),o+=r;else{const r=t-o;n.push(...a.slice(0,r)),s.push(...a.slice(r));for(let t=i+1;t<256;t++)s.push(...e[t]);break}}return[n,s]}sortAndSplit(e,t){const n=this.options.cache?this.stableBucketSort(e,t):this.unstableBucketSort(e,t),s=Math.floor((e.length+1)/2);return this.splitBuckets(n,s)}splitCubesByMedian(e,t){const{splitLogs:n}=this;for(;e.length<t;){let s=0,i=e[0].total;for(let t=1;t<e.length;t++){const n=e[t],o=n.total;i<o&&n.colors.length!==1&&(s=t,i=o)}const t=e[s];if(t.total===1)break;if(t.colors.length===1)break;const o=t.mainChannel,[a,r]=this.sortAndSplit(t.colors,o),c=new Cube(a,o),l=new Cube(r,o);e.splice(s,1,c,l);const d=[s,t.sortChannel,t.mainChannel];n.push(d)}return e}mergeCubesByMedian(e,t){const{splitLogs:n}=this;let s=n.length-1;for(;t<e.length;){const[o,i,l]=n[s],t=e[o],a=e[o+1];t.colors.push(...a.colors);const r=this.stableBucketSort(t.colors,i),c=[];for(let e=0;e<r.length;e++)c.push(...r[e]);t.colors=c,t.total+=a.total,t.sortChannel=i,t.mainChannel=l,e.splice(o,2,t),s--}return this.splitLogs=n.slice(0,e.length-1),e}getReplaceColors(e){const t=e.length<=256?new Uint8Array(16777216):new Uint16Array(16777216),n=new Array(e.length);for(let s=0;s<e.length;s++){const i=e[s].colors;let a=0,r=0,c=0,o=0;for(let n=0;n<i.length;n++){const[l,d,u,e]=i[n];a+=l*e,r+=d*e,c+=u*e,o+=e;const h=(u*256+d)*256+l;t[h]=s}const l=Math.round(a/o),d=Math.round(r/o),u=Math.round(c/o),h=(u*256+d)*256+l;n[s]=h}return this.colorMapping=new Uint8Array(t.buffer),n}getIndexedImage(){const{imageData:e,replaceColors:o,colorMapping:n}=this;if(n.length===0)throw new Error("colorMapping is not initialized");const i=new Uint32Array(e.data.buffer),t=e.width*e.height,s=o.length<=256?new Uint8Array(t):new Uint16Array(t);for(let e=0;e<t;e++){const o=i[e],a=o&16777215;s[e]=n[a]}return new Uint8Array(s.buffer)}apply(e){const{imageData:n,options:a}=this;let{cubes:t}=this;a.cache?t=e<t.length?this.mergeCubesByMedian(t,e):this.splitCubesByMedian(t,e):(e<t.length&&(t=this.initCubes()),t=this.splitCubesByMedian(t,e)),this.cubes=t;const o=this.getReplaceColors(t);this.replaceColors=o;const r=t.length<=256?this.colorMapping:new Uint16Array(this.colorMapping.buffer),s=new Uint32Array(n.data.buffer),i=new Uint32Array(s.length);for(let e=0;e<s.length;e++){const t=s[e],n=t&16777215,a=o[r[n]];i[e]=a|t&4278190080}const c=new Uint8ClampedArray(i.buffer);return new ImageData(c,n.width,n.height)}}export{InitialChannel as InitialChannel};export{R as R};export{G as G};export{B as B};export{Cube as Cube};export{MedianCut as MedianCut}