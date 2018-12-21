console.log('olè!')

d3.selection.prototype.moveToFront = function() {
	return this.each(function() {
		this.parentNode.appendChild(this);
	});
};
d3.selection.prototype.moveToBack = function() {
	return this.each(function() {
		var firstChild = this.parentNode.firstChild;
		if(firstChild) {
			this.parentNode.insertBefore(this, firstChild);
		}
	});
};

// Draw visualisation

let data;
let articles = [];
let previousPublications = [];
var duration = 500;
let space;
var arc = d3.arc().innerRadius(0);
var line = d3.line()
	.x(function(d) { return d.x; })
	.y(function(d) { return d.y; })
	.curve(d3.curveNatural)

let container = d3.select('#visualisation-container');
let m = window.innerHeight / 6;
let margin = {
	top: m / 3,
	right: m / 1.8,
	bottom: m / 3,
	left: m / 1.8
}
let width = container.node().clientWidth - margin.right - margin.left - 30;
let height = window.innerHeight - margin.top - margin.bottom;
// let r = width > 540 ? 20 : 12;
// r = height > 640 ? 20 : 12;
let r = height < width || width > 540 ? 20 : 12;
let r2 = 4
let firstPubRadius = 3;
let distributePadding = 3.5;

let svg = d3.select('svg#visualisation')
	.attr('width', width + margin.right + margin.left)
	.attr('height', height + margin.top + margin.bottom + 80);
let g = svg.append('g')
	.attr('transform', 'translate(' + margin.left + ',' + (margin.top + 40) + ')')

let y = d3.scalePoint()
	.range([0, height])

let x = d3.scaleLinear()
	.domain([0, 9])
	.range([0, width])
let xInverse = d3.scaleLinear()
	.domain([9, 0])
	.range([0, width])

let col = d3.scaleOrdinal()
	.domain(['romanzo', 'romanzo di racconti dentro una cornice', 'forma ibrida tra romanzo breve e racconto lungo', 'raccolta di racconti con un unico protagonista', 'raccolta di racconti', 'riscrittura', 'raccolta di saggi', 'romanzo fallito o opera non pubblicata', 'progetto incompiuto', 'posthumous'])
	.range(['#0490ca', '#00b79e', '#f2d371', '#eb9d69', '#bd504c', '#707e84', '#9d80bb', 'none', '#566573', 'transparent'])

d3.json('data.json').then(function(json) {
	data = json;
	y.domain(data.map((d) => { return d.id }))
	space = y.step() * 0.75;

	let gArticles = g.append('g').attr('class', 'periodicals');

	let decade = g.selectAll('.decade')
		.data(data, function(d) {
			let decadeNumber = '19' + d.id.toString().split('').slice(4, 5).join('') + '0'
			d.points = [];

			let _year = '19' + d.id.toString().split('').slice(4, 5).join('')

			for(var ii = 0; ii < 10; ii++) {
				let _year = '19' + d.id.toString().split('').slice(4, 5).join('') + ii;

				// check if there is a volume in this date (ii) and is not an abandoned work
				let ww = d.works.filter(function(e) {
					let checkYear = Math.round(+e.year.toString().split('').slice(3).join(''));
					return checkYear == ii &&
						e.kind != 'romanzo fallito o opera non pubblicata' &&
						e.kind != 'progetto incompiuto';
				})
				if(ww.length) {
					ww.forEach((e) => {
						let point = {
							"year": _year,
							"x": workPosition(e)[0],
							"y": workPosition(e)[1],
							"curve": e.curve,
							"there_is_work": true
						}
						d.points.push(point);
					})
				} else {
					let point = {
						"year": _year,
						"x": workPosition({ "year": decadeNumber + ii })[0],
						"y": workPosition({ "year": decadeNumber + ii })[1],
						"curve": undefined,
						"there_is_work": false
					}
					if(d.id == 'anni60' && ii == 6) {
						point.curve = "bezier";
					}
					if(d.id == 'anni70' && ii == 1) {
						point.curve = "bezier";
					}
					d.points.push(point);
				}
			}

			if(d.id == 'anni60') {
				d.points.splice(6, 1);
			}

			if(d.id == 'anni90') {
				d.points = []
			}

			// now return the identifier for the decade
			return d.id;
		})
		.enter()
		.append('g')
		.attr('class', function(d) { return 'decade ' + d.id; })
		.attr('transform', function(d) { return 'translate(0,' + y(d.id) + ')' })

	let thread = decade.selectAll('.thread')
		.data(function(d, i) {
			d.index = i;
			transformPeriodicals(d);
			return [d.points]
		})
		.enter()
		.append('path')
		.attr('class', 'thread')
		.attr('d', calvinLine)

	let decadeArcStart = decade.selectAll('.decade-arc.start')
		.data(function(d, i) { d.index = i; return [d]; })
		.enter()
		.append('path')
		.attr('class', 'decade-arc start thread')
		.attr('transform', function(d) {
			if(d.id == 'anni70') {
				return 'translate(' + (d.index % 2 == 0 ? 0 : width) + ', ' + (-y.step() / 2 + (r * distributePadding * 0.5)) + ')'
			}
			return 'translate(' + (d.index % 2 == 0 ? 0 : width) + ', ' + (-y.step() / 2) + ')'
		})
		.attr("d", function(d) {
			return decadeArcs(d, 'start', false);
		})

	let decadeArcEnd = decade.selectAll('.decade-arc.end')
		.data(function(d, i) {
			d.index = i;
			if(d.id == 'anni90') {
				return [];
			}
			return [d];
		})
		.enter()
		.append('path')
		.attr('class', 'decade-arc end thread')
		.attr('transform', function(d) {
			return 'translate(' + (d.index % 2 == 0 ? width : 0) + ', ' + (+y.step() / 2) + ')'
		})
		.attr("d", function(d) {
			return decadeArcs(d, 'end', false)
		})

	let article = gArticles.selectAll('.article')
		.data(articles)
		.enter()
		.append('circle')
		.attr('class', 'article')
		.classed('ghost-node', function(d) { return d.ghostNode })
		.attr('stroke',function(d){
			if (d.kind == 'saggio') {
				return 'var(--c-'+d.paper+')';
			}
		})
		.style('stroke-width', 1)
		.style('stroke-dasharray', function(d){
			// return '1 3'
			// return 'var(--dash-'+d.paper+')'
		})
		.attr('fill',function(d){
			if (d.kind != 'saggio') {
				if (col.domain().indexOf(d.kind) >= 0) {
					return col(d.kind)
				} else {
					return 'var(--c-'+d.paper+')'
				}
			}
			return 'white';
		})
		.attr('r', function(d) { return d.r })
		.attr('cx', function(d) { return d.x })
		.attr('cy', function(d) { return d.y })

	function ticked() {
		article
			.attr("cx", function(d) {
				if(d.x < 0) {
					// d.x = 0
					return d.x += .35
				} else if(d.x >= width*1.2) {
					d.x = width*1.2
					return d.x
				} else if(d.x > width) {
					// d.x = width
					return d.x -= .5
				} else if (d.year == '1985' ) {
					if (d.x > workPosition(d)[0]) {
						return d.x -= .5
					}
				}
				return d.x;
			})
			.attr("cy", function(d) {

				return d.y;
			});
	}

	let simulationArticle = d3.forceSimulation(articles)
		.force('x', d3.forceX(function(d) { return d.x }).strength(function(d){return 0.1}))
		.force('y', d3.forceY(function(d) { return d.y }).strength(function(d){return 0.75}))
		.force('collision', d3.forceCollide(function(d) { return d.r + 1.5 }).iterations(16))
		.on("tick", ticked)

	let characters = decade.selectAll('.character')
		.data(function(d,i){
			return d.characters;
		})
		.enter()
		.append('g')
		.attr('class', 'character')
		.attr('transform', function(d, i) {
			let _x = workPosition(d)[0]
			let _y = workPosition(d)[1]
			return 'translate(' + _x + ',' + _y + ')';
		})

	characters.append('path')
		.attr('d', 'M -3.5 0 L 0 -7 L 3.5 0 L 0 7 Z')
		.attr('stroke', 'white')
		.attr('stroke-width', 1)

	characters.append('text')
		.attr('x',0)
		.attr('y',-10)
		.attr('class', 'label character')
		.text(function(d){
			return d.name.split('').slice(0,1);
		})

	let works = decade.selectAll('.work')
		.data(function(d, i) {
			// compile data for visualising first publications add for line-thread-guide
			d.works.forEach((e, i) => {
				if(e.firstPublication) {
					let _y1 = e.year.toString().split('')[2];
					_y1 = 'anni' + _y1 + '0';
					let _y2 = e.firstPublication.toString().split('')[2];
					_y2 = 'anni' + _y2 + '0';
					let obj = {
						"x1": e.year,
						"y1": _y1,
						"x2": e.firstPublication,
						"y2": _y2
					}
					if(e.distributeElement) { obj.distributeElement = e.distributeElement }
					e.previousPublications = obj;
				}
			})
			return d.works;
		})
		.enter()
		.append('g')
		.attr('class', function(d) { return 'work ' + d.id })
		.attr('transform', function(d, i) {
			let _x = workPosition(d)[0]
			let _y = workPosition(d)[1]
			return 'translate(' + _x + ',' + _y + ')';
		})
	// Move La giornata di uno scriutatore to from to avoid silly overlapping with lines
	works.filter(function(d) {
		return d.id == 'V009';
	}).moveToFront();

	works.selectAll('.previous-publication')
		.data(function(d) {
			if(d.firstPublication) {
				return [d.previousPublications]
			} else {
				return []
			}
		})
		.enter()
		.append('path')
		.attr('class', 'previous-publication')
		.attr('d', function(d) {
			return previousPublicationsLine(d);
		})

	works.selectAll('.previous-publication-circle')
		.data(function(d) {
			if(d.firstPublication) {
				d.previousPublications.kind = d.kind
				return [d.previousPublications]
			} else {
				return []
			}
		})
		.enter()
		.append('circle')
		.attr('class', 'previous-publication-circle')
		.attr('fill', function(d) {
			return col(d.kind)
		})
		.attr('r', firstPubRadius)
		.attr('cx', function(d) {
			let arrrr = previousPublicationsLine(d).split(' ');
			arrrr = arrrr[arrrr.length - 1].split(',');
			return arrrr[0]
		})
		.attr('cy', function(d) {
			let arrrr = previousPublicationsLine(d).split(' ');
			arrrr = arrrr[arrrr.length - 1].split(',');
			return arrrr[1] - firstPubRadius * 2 - 5
		})

	works.append('circle')
		.attr('r', function(d) {
			d.r = r;
			if(d.kind == 'posthumous' || d.kind == 'progetto incompiuto') d.r /= 3.5
			return d.r;
		})
		.attr('fill', function(d) {
			if(d.kind == 'posthumous') {
				return '#566573';
			} else if(d.kind == 'romanzo') {
				return 'url(#glifo-romanzo)';
			} else if(d.kind == 'raccolta di racconti') {
				return 'url(#glifo-racconti)';
			} else if(d.kind == 'romanzo fallito o opera non pubblicata') {
				return 'url(#glifo-falliti)';
			} else if(d.kind == 'forma ibrida tra romanzo breve e racconto lungo') {
				return 'url(#glifo-ibrido)';
			} else if(d.kind == 'riscrittura') {
				return 'url(#glifo-riscrittura)';
			} else if(d.kind == 'raccolta di racconti con un unico protagonista') {
				return 'url(#glifo-racconti-protagonista)';
			} else if(d.kind == 'romanzo di racconti dentro una cornice') {
				return 'url(#glifo-romanzo-racconti-cornice)';
			} else if(d.kind == 'raccolta di saggi') {
				return 'url(#glifo-saggi)';
			} else if(d.kind == 'raccolta di saggi') {
				return 'url(#glifo-romanzo-racconti-cornice)';
			} else if(d.kind == 'progetto incompiuto') {
				return 'transparent';
			}
		})
		.style('stroke', function(d) { return col(d.kind) })
		.classed('posthumous', function(d) { return d.kind == 'posthumous' })
		.classed('unfinished', function(d) { return d.kind == 'progetto incompiuto' })

	works.append('text')
		.attr('class', 'label')
		.classed('small', function(d) {
			return d.kind == 'posthumous'
		})
		.attr('y', 0)
		.attr('x', 0)
		.attr('transform', function(d) {
			let _x = 0,
				_y = -d.r * 1.25;
			if(d.labelPosition) {
				if(d.labelPosition == "right") {
					_x = d.r * 1.25;
					_y = d.r * 0 + 3.5;
					if(d.kind == 'romanzo fallito o opera non pubblicata') {
						_x = d.r * .6;
					}
				} else if(d.labelPosition == "left") {
					_x = -d.r * 1.25;
					_y = d.r * 0 + 3.5;
					if(d.kind == 'romanzo fallito o opera non pubblicata') {
						_x = -d.r * .8;
					}
				} else if(d.labelPosition == "bottom") {
					_y = -_y + d.r
				}
			}
			d._x = _x;
			return 'translate(' + _x + ', ' + _y + ')';
		})
		.style('text-anchor', function(d) {
			if(d.labelPosition == "right") { return 'start' } else if(d.labelPosition == "left") { return 'end' }
		})
		.html(function(d) {
			let delta_y = rem2px(.6);
			if(d.labelPosition == "left" || d.labelPosition == "right") {
				d3.select(this).attr('y', -(d.label.split('_').length - 1) * delta_y / 2)
			} else if(d.labelPosition == "bottom") {
				// d3.select(this).attr('y', (d.label.split('_').length-1)*delta_y/2 )
			} else {
				d3.select(this).attr('y', -(d.label.split('_').length - 1) * delta_y)
			}

			let txt = '';
			d.label.split('_').forEach(function(t, i) {
				txt += `<tspan x="0" dy="${i==0?'0rem':delta_y}">${t}</tspan>`;
			})
			return txt
		})

	let yearsLabels = decade.selectAll('.label.year')
		.data(function(d) {
			let nested = d3.nest()
				.key(function(d) { return d.year })
				.rollup(function(leaves) {
					let obj = {
						'x': d3.max(leaves, function(d) { return d.x }),
						'y': d3.max(leaves, function(d) { return d.y }),
						'there_is_work': leaves[0].there_is_work
					}
					return obj;
				})
				.entries(d.points);
			// include the year 1969 because there is a 'first publication'
			if(d.id == 'anni60') {
				nested.find(function(ddd) { return ddd.key == '1969' }).value.to_be_included = true;
			}
			// return an array filtered as following
			return nested.filter((e, i) => { return e.value.there_is_work || i == 0 || e.value.to_be_included; });
		})
		.enter()
		.append('text')
		.attr('class', 'label year')
		.attr('x', function(d) { return d.value.x })
		.attr('y', function(d) { return d.value.there_is_work ? d.value.y + r * 1.6 : r * .8 })
		.text(function(d) {
			return d.key
		})

	// date and place of birth
	let birthInfo = g.append('text')
		.attr('x', -margin.left + 30)
		.attr('y', -margin.top - 15)
		.classed('info', true);
	birthInfo.append('tspan')
		.attr('x', -margin.left + 30)
		.text('Italo Calvino nasce il 15 ottobre 1923');
	birthInfo.append('tspan')
		.attr('x', -margin.left + 30)
		.attr('dy', rem2px(.6))
		.text('a Santiago de las Vegas (L’Avana, Cuba)');

	// date and place of death
	let deathInfoXpos = workPosition({ 'year': '1985.2' })[0]
	decade.filter(function(d) {
			return d.id == 'anni80'
		}).append('rect')
		.attr('x', deathInfoXpos - 2)
		.attr('y', -3)
		.attr('width', 6)
		.attr('height', 6);
	let deathInfo = decade.filter(function(d) {
			return d.id == 'anni80'
		}).append('text')
		.classed('info', true)
		.style('text-anchor','middle')
		.attr('x', deathInfoXpos)
		.attr('y', 5);
	deathInfo.append('tspan')
		.attr('x', deathInfoXpos)
		.attr('dy', rem2px(.6))
		.text('Muore a Siena');
	deathInfo.append('tspan')
		.attr('x', deathInfoXpos)
		.attr('dy', rem2px(.6))
		.text('il 19 Settembre');
	deathInfo.append('tspan')
		.attr('x', deathInfoXpos)
		.attr('dy', rem2px(.6))
		.text('1985');

	// I Meridiani e Pubblicazioni Pustume
	decade.filter(function(d) {
			return d.id == 'anni90'
		}).append('text')
		.text('Collana «I Meridiani»')
		.attr('text-anchor', 'middle')
		.attr('x', function(d) {
			return workPosition({ year: '1997.3' })[0]
		})
		.attr('y', -r * 2.3)
		.classed('info', true);

	decade.filter(function(d) {
			return d.id == 'anni90'
		}).append('text')
		.text('Pubblicazioni postume')
		.attr('text-anchor', 'middle')
		.attr('x', function(d) {
			return workPosition({ year: '1991.7' })[0]
		})
		.attr('y', -r * 2.3)
		.classed('info', true);

	d3.selectAll('.label').each(function(d,i){

		clone_d3_selection(d3.select(this),'')

		d3.select(this).classed('white-shadow', true);

	})

	activateStorytelling();
});

function transformPeriodicals(data) {

	data.works.forEach((d) => {
		if (d.year < 1985) {
			let ghostNode = {
					'x': workPosition(d)[0],
					'y': y(data.id) + workPosition(d)[1],
					'fx': workPosition(d)[0],
					'fy': y(data.id) + workPosition(d)[1],
					'r': r,
					'ghostNode': true,
					'decade': data.id,
					'decadeIndex': data.index
				}
			articles.push(ghostNode);
		}
	})

	data.periodicals.forEach((d) => {
		if (!d.amount) {
			d.amount = 1;
		}
		for(var i = 0; i < d.amount; i++) {
			// filter unità
			let position = d.year.toString().split('')[3];
			let _x = d.year.toString().split('')[2] % 2 == 0 ? x(+position) : xInverse(+position);
			let node = {
				'x':_x,
				'y':y(data.id),
				'r':r2 + d3.randomUniform(-1.5, 0)(),
				'decade':data.id,
				'decadeIndex':data.index,
				'year':d.year,
				'paper':d.paper,
				'title':d.title,
				'kind':d.type
			}
			// articles.push(node);
			if(d.paper == 'unita') {
				if(d.year <= 1955) {
					articles.push(node);
				}
			} else {
				articles.push(node);
			}
		}
	})
}

function previousPublicationsLine(d, open) {

	let positionX1 = d.x1.toString().split('')[3];
	let _x1 = d.x1.toString().split('')[2] % 2 == 0 ? x(positionX1) : xInverse(positionX1);

	let positionX2 = d.x2.toString().split('')[3];
	let _x2 = d.x2.toString().split('')[2] % 2 == 0 ? x(positionX2) : xInverse(positionX2);

	if(d.x1 == 1963 && d.x2 == 1957) {
		_x2 -= 6
	}

	if(d.x1 == 1965 && d.x2 == 1957) {
		_x2 += 6
	}

	let end_y = d.distributeElement ? r * d.distributeElement * distributePadding : 0;
	end_y += y(d.y1);
	end_y -= r * 2;
	end_y -= 3;
	end_y -= firstPubRadius * 2;

	if(d.x2 == 1969) {
		end_y += r * .85
	}

	if(open) {
		end_y += space;
	}

	let p = [{ 'x': 0, 'y': 0 - r }, { 'x': _x2 - _x1, 'y': y(d.y2) - end_y }]
	return `M${p[0].x},${p[0].y} C${p[0].x},${p[1].y/2} ${p[1].x},${p[1].y/2} ${p[1].x},${p[1].y}`;
}

function workPosition(d) {
	let position = d.year.toString().split('')[3];
	position = +d.year.toString().split('').slice(3).join('')
	let _x = d.year.toString().split('')[2] % 2 == 0 ? x(position) : xInverse(position);
	let _y = d.distributeElement ? r * d.distributeElement * distributePadding : 0;
	return [_x, _y]
}

function decadeArcs(d, position, open) {
	if(position == "start") {
		let myString;
		if(d.index % 2 == 0) {
			myString = arc({
				outerRadius: y.step() / 2,
				startAngle: -Math.PI / 2,
				endAngle: -Math.PI,
				// endAngle: d.index % 2 == 0 ? -Math.PI/2 : Math.PI/2
			}).split(/[A-Z]/);
		} else {
			myString = arc({
				outerRadius: y.step() / 2,
				startAngle: Math.PI / 2,
				endAngle: Math.PI,
				// endAngle: d.index % 2 == 0 ? -Math.PI/2 : Math.PI/2
			}).split(/[A-Z]/);
		}
		if(d.id != 'anni70') {

			// console.log(myString[1].split(','))

			if(open) {
				let px = myString[1].split(',')[0]
				let py = myString[1].split(',')[1] - space
				// console.log(px,py, myString[1])
				return `M${px} ${py} L ${myString[1]} A ${myString[2]}`;
			} else {
				let px = myString[1].split(',')[0]
				let py = myString[1].split(',')[1]
				return `M${px} ${py} L ${myString[1]} A ${myString[2]}`;
				// return "M" + myString[1] + "A" + myString[2]
			}
		} else {

			// x1 = y.step()/2;
			// y1 = 0;
			//
			// x2 = 0;
			// y2 = y.step()/2 + r * distributePadding * 0.5;
			//
			let thisSpace = r * distributePadding * 0.5;

			if(open) {
				let px = myString[1].split(',')[0]
				let py = myString[1].split(',')[1] - space
				// console.log(px,py, myString[1])
				return `M${px} ${py - thisSpace} l 0 ${0} L ${myString[1]} A ${myString[2]}`;
				// return `M${px} ${py} L ${myString[1]} A ${myString[2]}`;
			} else {
				let px = myString[1].split(',')[0]
				let py = myString[1].split(',')[1]
				return `M${px} ${py - thisSpace} l 0 ${py} L ${myString[1]} A ${myString[2]}`;
				// return "M" + myString[1] + "A" + myString[2]
			}

			// // old
			// if (open) {
			//   let px = x1
			//   let py = y1-space
			//   return `M ${px} ${py} L ${x1} ${y1}, C ${x1} ${y1+y.step()/20}, ${x2+y.step()/1.8} ${y2+y.step()/10}, ${x2} ${y2}`
			// } else {
			//   return `M ${x1} ${y1} L ${x1} ${y1}, C ${x1} ${y1+y.step()/20}, ${x2+y.step()/1.8} ${y2+y.step()/10}, ${x2} ${y2}`
			//   // return `M ${x1} ${y1}, C ${x1} ${y1+y.step()/20}, ${x2+y.step()/1.8} ${y2+y.step()/10}, ${x2} ${y2}`
			// }
		}
	} else {
		let myString;
		if(d.index % 2 == 0) {
			myString = arc({
				outerRadius: y.step() / 2,
				startAngle: 0,
				endAngle: Math.PI / 2,
				// endAngle: d.index % 2 == 0 ? -Math.PI/2 : Math.PI/2
			}).split(/[A-Z]/);
		} else {
			myString = arc({
				outerRadius: y.step() / 2,
				startAngle: 0,
				endAngle: -Math.PI / 2,
				// endAngle: d.index % 2 == 0 ? -Math.PI/2 : Math.PI/2
			}).split(/[A-Z]/);
		}
		if(open) {
			return "M" + myString[1] + "A" + myString[2] + "l 0 " + space;
		} else {
			return "M" + myString[1] + "A" + myString[2] + "l 0 0";
		}
	}
}

function wrap(text) {
	text.each(function() {
		var text = d3.select(this),
			words = text.text().split(/_+/);

		text.text(null);

		var word,
			line = [],
			lineNumber = 0,
			lineHeight = 0.55, // ems
			y = text.attr("y"),
			transform = text.attr("transform").replace('translate', '').replace(/\s+/, '').replace(/\(/, '').replace(/\)/, '').split(','),
			dy = parseFloat(text.attr("dy"));

		words.forEach((w, i) => {
			tspan = text.append("tspan")
				.attr("x", 0)
				.attr("y", y)
				.attr("dy", i * lineHeight + 'rem')
				.text(w);

			if(i > 0) {
				transform[1] -= rem2px(i * lineHeight) / 2;
				text.attr('transform', `translate(${transform[0]}, ${transform[1]})`)
			}
		})

	});
}

function rem2px(rem) {
	return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

function clone_d3_selection(selection, i) {
            // Assume the selection contains only one object, or just work
            // on the first object. 'i' is an index to add to the id of the
            // newly cloned DOM element.
    var attr = selection.node().attributes;
		var innerElements = selection.html()
    var length = attr.length;
    var node_name = selection.property("nodeName");
    var parent = d3.select(selection.node().parentNode);
    var cloned = parent.append(node_name)
                 .attr("id", selection.attr("id") + i)
								 .html(innerElements)

    for (var j = 0; j < length; j++) { // Iterate on attributes and skip on "id"
        if (attr[j].nodeName == "id") continue;
        cloned.attr(attr[j].name,attr[j].value);
    }
    return cloned;
}
