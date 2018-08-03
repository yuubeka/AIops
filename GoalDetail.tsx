import * as React from 'react';
import * as Style from '../LogStyle';
import * as Timeline from './Timeline';
import * as GoalTimeline from './GoalTimeLine';
import * as Filter from './InceptorFilter';
import * as moment from 'moment';
import * as echarts from 'echarts';
import Config from '../LogConfig';
import axios from 'axios';
import vis from 'vis/dist/vis';
import 'vis/dist/vis.css';
import { withRouter } from 'react-router';
import {
  GoalTaskBean,
  InceptorGoalResponse,
  InceptorGoalTimelineResponse,
  LogEntity,
  TaskBean
} from '../LogDataStructure';
import { Affix, BackTop, Button, Collapse, List, notification, Pagination, Tree, Popover } from 'antd';
import { HashLink as Link } from 'react-router-hash-link';

const Panel = Collapse.Panel;
const TreeNode = Tree.TreeNode;

interface GoalDetailState {
  date: number;
  goal: GoalTaskBean;
  items?: {};
  taskitems?: {};
  groups?: any[];
  itemDataSet?: vis.DataSet;
  itemTaskDataSet?: vis.DataSet;
  page: number;
  pageSize: number;
  totalNum?: number;
  task: TaskBean;
}

export default withRouter(class GoalDetail extends React.Component<any, GoalDetailState> {
  timeline: any;
  myChart: any;
  arr2: any = [];

  renderStatus = () => {
    console.log('renderStatus');
    const color = Style.goalStatus(this.state.goal.goalStatus);
    return (
      <p style={{display: 'inline-block', marginLeft: '20px', marginRight: '20px'}}>
        <span style={color[0]}>{color[1]}</span>
      </p>
    );
  }

  showTimeline = (items, groups, min, max) => {
    console.log('showTimeline');
    console.log(items);
    const container = document.getElementById('inceptor-goal-timeline');
    const option = {
      orientation: 'top',
      minHeight: 600,
      horizontalScroll: true,
      zoomKey: 'ctrlKey',
      min: moment(min),
      max: moment(max),
      start: moment(this.state.goal.startTime),
      end: moment(this.state.goal.endTime),
      // zoomMax: 3600000,
      stack: false,
      tooltip: {
        followMouse: true,
      }
    };
    this.timeline = new vis.Timeline(container, items, groups, option);
  }

  showPie = (item) => {
    console.log('showPie');
    console.log(item);
    var arr: any = [];
    this.arr2 = [];
    var tag = 0;
    if (item.tasks === null) {
      arr.push({
        name: item.name,
        value: item.duration,
      });
      this.arr2.push({tag: tag});
    } else {
      const length = item.tasks.length - 1;
      item.tasks.forEach((task, index) => {
        if (index === 0) {
          if (item.startTime !== item.tasks[index].startTime) {
            arr.push({
              name: 'Unknown-1',
              value: item.tasks[index].startTime - item.startTime,
            });
            tag += 1;
            this.arr2.push({tag: tag});
          }
          arr.push({
            name: item.tasks[index].name,
            value: item.tasks[index].duration,
          });
          this.arr2.push({tag: tag});
        } else {
          if (item.tasks[index - 1].endTime !== item.tasks[index].startTime) {
            tag += 1;
            arr.push({
              name: 'Unknown-' + tag,
              value: item.tasks[index].startTime - item.tasks[index - 1].endTime,
            });
            this.arr2.push({tag: tag});
          }
          arr.push({
            name: item.tasks[index].name,
            value: item.tasks[index].duration,
          });
          this.arr2.push({tag: tag});
        }
        if (index === length && item.tasks[index].endTime !== item.endTime) {
          tag += 1;
          arr.push({
            name: 'Unknown-' + tag,
            value: item.endTime - item.tasks[index].endTime,
          });
          this.arr2.push({tag: tag - 1});
        }
      });
    }

    var option = {
      tooltip: {show: 'true'},
      legend: {
        data: arr,
        x: 'center',
        y: 'bottom',
      },
      color: ['#1890ff', '#7ab275', '#EE82EE', '#FF4500', '#FFA500', '#DA70D6'],
      series: [
        {
          name: 'Tasks Item',
          type: 'pie',
          data: arr,
          radius: ['0', '50%'],
          center : [ '50%', '50%' ],
          avoidLabelOverlap: true,
          labelLine: {
            normal: {
              length: 3,
              length2: 6,
              lineStyle: {
                color: '#333'
              }
            }
          },
          label: {
            normal: {
              formatter:
              '{title|{a}}{abg|}\n  {b| {b} }\n {b| Duration:}{value|{c} ms } \n {per|{d}%}\n ',
              backgroundColor: '#eee',
              borderColor: '#aaa',
              borderWidth: 1,
              borderRadius: 4,
              position: 'insideBottom',
              rich: {
                title: {color: '#eee', align: 'center'},
                abg: {
                  backgroundColor: '#333',
                  width: '100%',
                  align: 'right',
                  height: 20,
                  borderRadius: [4, 4, 0, 0]
                },
                a: {color: '#999', lineHeight: 20, align: 'center'},
                hr: {borderColor: '#aaa', width: '100%', borderWidth: 0.5, height: 0, align: 'center'},
                b: {fontSize: 12, lineHeight: 20, align: 'center'},
                per: {color: '#eee', backgroundColor: '#334455', padding: [2, 4], borderRadius: 2, align: 'center'}
              }
            }
          }
        }
       ],
    };
    this.myChart = echarts.init(document.getElementById('chartmain'));

    this.myChart.setOption(option);
    this.myChart.on('click', this.eConsole);

  }

  eConsole = (param) => {
    console.log(param);
    if (typeof param.seriesIndex === 'undefined') {
      return;
    }
    if (param.type === 'click') {
      console.log(param.dataIndex);
      console.log(this.arr2);
      const index = param.dataIndex - this.arr2[param.dataIndex].tag;
      const item = this.state.itemTaskDataSet.get(index);
      console.log(index);
      console.log(item);
      var i = param.data.name.indexOf('-');
      if (param.data.name.substring(0, i) === 'Unknown') {
        return;
      }
      if (item === null) {
        return;
      }
      if (this.state.goal.tasks !== null || (item.id !== null)) {
        console.log('axios.post');
        axios.post('/api/log/inceptor/goal', {goalID: item.group, date: this.state.date}, {timeout: Config.REQUEST_TIMEOUT})
          .then(res => {
            console.log((res.data as InceptorGoalResponse).goal);
            console.log((res.data as InceptorGoalResponse).goal.tasks);
            this.props.history.push({
              pathname: '/log/task',
              state: {
                node: this.state.goal.tasks[item.id],
                entities: (res.data as InceptorGoalResponse).goal.entities,
                date: this.state.date,
                id: item.group,
              }
            });
          })
          .catch(err => {
            notification.error({message: 'ERROR', description: err.message, duration: 3});
          });
      }
    }
  }

  showLogs = () => {
    const renderItem = (entity: LogEntity, index: number) => (
      <List.Item key={'all-' + index} style={Style.entity(entity.level)}>
        <div style={Style.wrap}>
          {entity.content.split('\n').map((value, id) =>
            id === 0 ? <p style={{margin: 0}} key={id}>{index + 1}: {value}</p> :
              <p style={{margin: 0}} key={id}>{value}</p>
          )}
        </div>
      </List.Item>
    );
    return (
      <Collapse style={{marginTop: '20px'}}>
        <Panel header="All Logs" key="log-panel" style={{background: 'rgba(0,255,0,0.2)'}}>
          <List dataSource={this.state.goal.entities} renderItem={renderItem}/>
        </Panel>
      </Collapse>
    );
  }

  onItemClick = (event) => {
    console.log('onItemClick');
    const props = this.timeline.getEventProperties(event);
    console.log(props);
    if (props.what !== 'item') {
      return;
    }
    console.log(this.state.itemDataSet);
    const item = this.state.itemDataSet.get(props.item);
    console.log(item);
    if (item.id === this.state.goal.id) {
      return;
    }
    console.log(item.id);
    axios.post('/api/log/inceptor/goal', {goalID: item.id, date: this.state.date}, {timeout: Config.REQUEST_TIMEOUT})
      .then(res => {
        console.log((res.data as InceptorGoalResponse).goal);
        this.props.history.push({
          pathname: '/log/goal',
          state: {
            goal: (res.data as InceptorGoalResponse).goal,
            date: this.state.date,
          }
        });
      })
      .catch(err => {
        notification.error({message: 'ERROR', description: err.message, duration: 3});
      });
  }

  onPageChange = (page) => {
    this.setState({page: page});
    const indices = Filter.indices(page, this.state.pageSize);
    const bean = {
      goalID: this.state.goal.id,
      date: this.state.date,
      from: indices[0],
      to: indices[1],
    };
    this.changeData(bean);
  }

  changeData = (bean) => {
    console.log('changeData');
    axios.post('/api/log/inceptor/goaltimeline', bean, {timeout: Config.REQUEST_TIMEOUT})
      .then(res => {
        const response = res.data as InceptorGoalTimelineResponse;
        const data = Timeline.timelineData(response.goalsBySession, bean.from, response.targetSession, this.state.goal.id);
        const dataSet = Timeline.dataSet(data.items, data.groups);
        this.setState({
          items: data.items,
          groups: data.groups,
          itemDataSet: dataSet[0],
          totalNum: response.size,
        });
        this.timeline.setData({
          items: dataSet[0],
          groups: dataSet[1],
        });
      })
      .catch(err => {
        notification.error({message: 'ERROR', description: err.message, duration: 3});
      });
  }

  genTree = () => {
    console.log('genTree');
    const index = '0';
    const color = Style.goalStatus(this.state.goal.goalStatus);
    const desc = this.state.goal.desc.split('\n');
    let shortSQL = desc[2];
    if (shortSQL.length > 40) {
      shortSQL = shortSQL.substring(0, 40) + '...';
    }
    const popContent = (
      <div>
        <p><span style={{fontWeight: 'bold'}}>Duration: </span>{`${this.state.goal.duration} ms`}</p>
        <p><span style={{fontWeight: 'bold'}}>Goal Status: </span><span style={color[0]}>{color[1]}</span></p>
        <p><span style={{fontWeight: 'bold'}}>SQL: </span>{desc[2]}</p>
      </div>
    );
    const title = (
      <Popover placement="top" title={this.state.goal.name} content={popContent} mouseEnterDelay={0.5}>
        <div onClick={() => this.onLinkClick('goal', this.state.goal.id)}>
            <span style={{...{fontSize: '15px'}}}>
              {`[${index}] ${this.state.goal.name}`}&nbsp;
            </span>
          <span style={{...{fontSize: '15px'}}}>
              {`(dur: ${this.state.goal.duration} ms)`}&nbsp;
            </span>
        </div>
      </Popover>
    );
    return (
      <Tree defaultExpandAll={true} showLine={true}>
        {this.state.goal.tasks === null ? <TreeNode title={title} key={index}/> : (
          <TreeNode title={title} key={index}>
            {this.state.goal.tasks.map((node, subIndex) => this.genNode(node, '0', subIndex))}
          </TreeNode>
        )}
      </Tree>
    );

  }

  genNode = (node: TaskBean, parentId: string, id: number) => {
    console.log('genNode');
    const currentId = parentId + '-' + id;
    const statusColor = Style.taskStatus(node.taskStatus);
    const errorColor = Style.taskError(node.errorType);
    const popContent = (
      <div>
        <p>
          <span style={{fontWeight: 'bold'}}>Duration: </span>
          {node.duration} ms&nbsp;
          ({moment(node.startTime).format(Config.DATE_TIME_FORMAT)} ~ {moment(node.endTime).format(Config.DATE_TIME_FORMAT)})
        </p>
        <p><span style={{fontWeight: 'bold'}}>Task Status: </span><span style={statusColor[0]}>{statusColor[1]}</span></p>
        <p><span style={{fontWeight: 'bold'}}>Error Type: </span><span style={errorColor[0]}>{errorColor[1]}</span></p>
      </div>
    );
    console.log(node);
    const Id = this.state.goal.id;
    const date = this.state.date;
    const entity = this.state.groups;
    const status = node.taskStatus;
    const title = (
      <Popover placement="top" title={node.desc.split('\n')[0]} content={popContent} mouseEnterDelay={0.5}>
        <Link to={{pathname: '/log/task', state: {node: node, entities: entity, date: date, id: Id}}} style={Style.task(status, node.errorType)}>
          {currentId + ': ' + node.name + `(dur: ${node.duration} ms)`}
        </Link>
      </Popover>

    );
    return <TreeNode title={title} key={currentId}/>;
  }

  onLinkClick = (type: string, goalId: string, task?: TaskBean) => {
    console.log('onLinkClick');
    axios.post('/api/log/inceptor/goal', {goalID: goalId, date: this.state.date}, {timeout: Config.REQUEST_TIMEOUT})
      .then(res => {
        switch (type) {
          case 'goal':
            this.props.history.push({
              pathname: '/log/goal',
              state: {
                goal: (res.data as InceptorGoalResponse).goal,
                date: this.state.date,
              }
            });
            break;
          case 'task':
            this.props.history.push({
              pathname: '/log/task',
              state: {
                node: task,
                entities: (res.data as InceptorGoalResponse).goal.entities,
                date: this.state.date,
                id: goalId,
              }
            });
            break;
          default:
            notification.error({message: 'ERROR', description: 'Unsupported type', duration: 3});
        }
      })
      .catch(err => {
        notification.error({message: 'ERROR', description: err.message, duration: 3});
      });
  }

  constructor(props: any) {
    super(props);
    console.log(props);
    this.state = {
      date: props.location.state.date,
      goal: props.location.state.goal,
      page: 1,
      pageSize: 20,
      task: props.location.state.goal.tasks
    };
    console.log(this.state.goal);

    const indices = Filter.indices(1, this.state.pageSize);
    const bean = {
      goalID: this.state.goal.id,
      date: this.state.date,
      from: indices[0],
      to: indices[1],
    };
    axios.post('/api/log/inceptor/goaltimeline', bean, {timeout: Config.REQUEST_TIMEOUT})
      .then(res => {
        const response = res.data as InceptorGoalTimelineResponse;
        const data = Timeline.timelineData(response.goalsBySession, bean.from, response.targetSession, this.state.goal.id);
        const dataSet = Timeline.dataSet(data.items, data.groups);
        this.setState({
          items: data.items,
          groups: data.groups,
          itemDataSet: dataSet[0],
          totalNum: response.size,
        });
        console.log(dataSet[0]);
        this.showTimeline(dataSet[0], dataSet[1], data.min, data.max);
      })
      .catch(err => {
        notification.error({message: 'ERROR', description: err.message, duration: 3});
      });

  }

  componentWillReceiveProps(props: any) {
    console.log('componentWillReceiveProps');
    const newDate = props.location.state.date;
    const newGoal = props.location.state.goal;
    this.setState({
      date: newDate,
      goal: newGoal,
      page: 1,
    });
    console.log(this.state.goal);
    const indices = Filter.indices(1, this.state.pageSize);
    const bean = {
      goalID: newGoal.id,
      date: newDate,
      from: indices[0],
      to: indices[1],
    };
    axios.post('/api/log/inceptor/goaltimeline', bean, {timeout: Config.REQUEST_TIMEOUT})
      .then(res => {
        const response = res.data as InceptorGoalTimelineResponse;
        const data = Timeline.timelineData(response.goalsBySession, bean.from, response.targetSession, this.state.goal.id);
        const dataSet = Timeline.dataSet(data.items, data.groups);
        this.setState({
          items: data.items,
          groups: data.groups,
          itemDataSet: dataSet[0],
          totalNum: response.size,
        });
        this.timeline.setData({
          items: dataSet[0],
          groups: dataSet[1],
        });
        this.timeline.setOptions({
          min: moment(data.min),
          max: moment(data.max),
        });
      })
      .catch(err => {
        notification.error({message: 'ERROR', description: err.message, duration: 3});
      });

    console.log(this.state.goal);
    const goaldata = GoalTimeline.goaltimelineData(this.state.goal);
    const goaldataSet = GoalTimeline.dataSet(goaldata.items, this.state.goal);
    console.log(goaldataSet);
    console.log(goaldataSet[0]);
    this.setState({
      taskitems: goaldata.items,
      itemTaskDataSet: goaldataSet[0],
    });
    this.showPie(props.location.state.goal);
  }

  componentDidMount() {
    console.log('componentDidMount');
    window.scrollTo(0, 0);

    console.log(this.state.goal);
    const goaldata = GoalTimeline.goaltimelineData(this.state.goal);
    const goaldataSet = GoalTimeline.dataSet(goaldata.items, this.state.goal);
    console.log(goaldataSet);
    console.log(goaldataSet[0]);
    this.setState({
      taskitems: goaldata.items,
      itemTaskDataSet: goaldataSet[0],
    });
    this.showPie(this.state.goal);

  }

  render() {
    console.log('render');
    return (
      <div style={Style.page}>
        <BackTop/>
        <Affix>
          <Button style={{marginLeft: '-70px'}} onClick={this.props.history.goBack}>back</Button>
        </Affix>
        <div>
          <h1 style={{display: 'inline-block'}}>{this.state.goal.name}</h1>
          {this.renderStatus()}
        </div>
        {this.state.goal.duration !== null && (
          <p style={{marginLeft: '20px', marginTop: '10px'}}>
            <span style={{fontWeight: 'bold'}}>{this.state.goal.duration} ms: </span>
            {moment(this.state.goal.startTime).format(Config.DATE_TIME_FORMAT)} ~ {moment(this.state.goal.endTime).format(Config.DATE_TIME_FORMAT)}
          </p>
        )}
        <p style={{marginLeft: '20px'}}><span style={{fontWeight: 'bold'}}>Status Message: </span>{this.state.goal.statusMsg}</p>
        <div style={{marginLeft: '20px'}}>
          <span style={{fontWeight: 'bold'}}>Desc: </span>
          {this.state.goal.desc.split('\n').map((value, index) => <p style={{margin: 0}} key={index}>{value}</p>)}
        </div>
        <br />
        <div style={{marginTop: '10px'}}>
          <h3>Goal-Tasks: </h3>
          {this.genTree()}
        </div>
        <h3 style={{marginTop: '20px'}}>Tasks Pie:</h3>
        <div id="chartmain" style={{width: '600px', height: '420px'}}/>
        <h3 style={{marginTop: '20px'}}>Nearby Goals:</h3>
        <div id="inceptor-goal-timeline" style={{marginTop: '20px'}} onClick={this.onItemClick}/>
        <Pagination
          style={{float: 'right', marginTop: '20px'}}
          total={this.state.totalNum}
          current={this.state.page}
          pageSize={this.state.pageSize}
          onChange={this.onPageChange}
          showQuickJumper={true}
        />
        <div style={{clear: 'both'}}/>
        {this.state.goal.entities !== null && this.showLogs()}

      </div>

      /*<Try {...{date: this.state.date, node: this.state.goal, entities: this.state.groups}}/> 添加一个新组件，并传入参数*/
    );
  }
});
