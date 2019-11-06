'use strict'

// attribute hook for viewBox to ensure correct camel case
$.attrHooks['viewbox'] = {
  set: function(elem, value, name) {
    elem.setAttributeNS(null, 'viewBox', value + '')
    return value
  }
}

const template = document.createElement('template')
template.innerHTML = `
    <style>
    svg {
      width: 100%;
      display: block;
      margin: auto;
      height: auto;
    }

    .node {
      white-space: nowrap;
    }

    .node rect,
    .node circle,
    .node ellipse {
      stroke: #333;
      fill: #fff;
    }

    .cluster rect {
      stroke: #333;
      fill: #000;
      fill-opacity: 0.1;
      stroke-width: 1.5px;
    }

    .edgePath path.path {
      stroke: #333;
      stroke-width: 1.5px;
      fill: none;
    }
    </style>
    <div style="width:80%; padding:8px; color:gray; background-color:#eee; margin:0 auto; text-align:center">
      <i id="message"></i>
    </div>`

function message (text) {
  let div = template.content.cloneNode(true)
  div.querySelector('#message').appendChild(document.createTextNode(text))
  return div
}

class DagreViewer extends HTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.appendChild(message('drawing diagram'))
  }

  render () {
    const self = this

    if (!this.alreadyRendered) {
      var d3URL = wiki.pluginRoutes['dagre'] + '/client/js/d3/d3.v4.min.js'
      wiki.getScript(d3URL, function () {
        var dagreD3URL = wiki.pluginRoutes['dagre'] + '/client/js/dagre/dagre-d3.min.js'
        wiki.getScript(dagreD3URL, function () {
          var glDotURL = wiki.pluginRoutes['dagre'] + '/client/js/dagre/graphlib-dot.min.js'
          wiki.getScript(glDotURL, function () {
            var dot = self.decodedHTML()

            var g
            var render = dagreD3.render()

            try {
              g = graphlibDot.read(dot)
            } catch (err) {
              console.log('graphlibDot.read', err, dot)
              self._replaceShadowRoot(message('Error reading internal dot'))
            }

            try {
              console.log("g", g)
              var tg = new dagreD3.graphlib.Graph({ directed: true, compound: true, multigraph: true })
                .setGraph({ rankdir: g._label['rankdir'], 
                            nodesep: 30,
                            ranksep: 30,
                            marginx: 10,
                            marginy: 10
                          })

              var nodes = g.nodes()
              var edges = g.edges()
              //var groups = g.groups()

              nodes.forEach(function (node) {
                var nodeLabel = g._nodes[node]
                nodeLabel['label'] = node
                tg.setNode(node, nodeLabel)
              })

              edges.forEach(function (edge) {
                tg.setEdge(edge.v, edge.w, { curve: d3.curveBasis })
              })

              console.log("tg", tg)

              d3.select(self.shadowRoot)
                .append('svg:svg')
                .append('svg:g')
                .call(render, tg)

              var svg = $(self.shadowRoot).find('svg')
              var svgGroup = $(svg).find('svg g')

              // Center the graph
              var xCenterOffset = (svg.attr("width") - tg.graph().width) / 2;
              svgGroup.attr("transform", "translate(" + xCenterOffset + ", 20)");
              svg.attr("height", tg.graph().height + 40);

              // Set the viewBox
              svg.attr('viewBox', '0 0 ' + tg.graph().width + ' ' + tg.graph().height)

              $(self.shadowRoot).find('.node').click((event) => {
                event.stopPropagation()
                event.preventDefault()
                var n1 = []
                $(event.target).parents('.node').find('.label').find('tspan').each(function () {
                  n1.push($(this).text())
                })
                let node = n1.join(' ')
                console.log('click', node)
                let page = event.shiftKey ? null : $(self).parents('.page')
                wiki.doInternalLink(node, page)
              })
              // hide message
              $(self.shadowRoot).find('div').attr('style', 'display:none;')
              self.alreadyRendered = true
            } catch (err) {
              console.log('render', err)
              self._replaceShadowRoot(message(err.message))
            }
          })
        })
      })
    }
    return this.alreadyRendered
  }

  // see https://stackoverflow.com/a/34064434/1074208
  decodedHTML () {
    return new DOMParser()
      .parseFromString(this.innerHTML, 'text/html')
      .documentElement
      .textContent
  }

  _replaceShadowRoot (el) {
    // remove all child elements: https://stackoverflow.com/a/3955238/1074208
    while (this.shadowRoot.firstChild) {
      this.shadowRoot.removeChild(this.shadowRoot.firstChild)
    }
    this.shadowRoot.appendChild(el)
  }
}

customElements.define('dagre-viewer', DagreViewer)
export default DagreViewer
