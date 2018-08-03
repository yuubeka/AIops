import * as React from 'react';
import * as Style from '../LogStyle';
import * as moment from 'moment';
import * as echarts from 'echarts';
import Config from '../LogConfig';
import { withRouter } from 'react-router';
import { Affix, BackTop, Button, Collapse, Icon, List, notification, Tree } from 'antd';
import { InceptorGoalResponse, LogEntity, TaskBean } from '../LogDataStructure';
import { HashLink as Link } from 'react-router-hash-link';
import axios from 'axios';
import vis from 'vis/dist/vis';
import * as TaskTimeline from './TaskTimeLine';

const Panel = Collapse.Panel;
const TreeNode = Tree.TreeNode;

interface TaskDetailState {
  date: number;
  goalId: string;
  node: TaskBean;
  entities: LogEntity[];
  itemtaskDataSet?: vis.DataSet;
  taskitems?: {};
}

export default withRouter(class TaskDetail extends React.Component<any, TaskDetailState> {
  myChart: any;
  arr2: any = [];

  showExceptions = () => {
    const renderItem = (value: number, index: number) => {
      const link = (
        <Link to={{pathname: '/log/detail', hash: value.toString(), state: {entities: this.state.entities}}} key={'link-' + index} smooth={true}>
          <Icon type="right-circle-o"/>
        </Link>
      );
      return (
        <List.Item key={'err-' + index} actions={[link]}>
          <div style={Style.wrap}>
            {this.state.entities[value].content.split('\n').map((v, id) =>
              <p style={{margin: 0}} key={id}>{v}</p>
            )}
          </div>
        </List.Item>
      );
    };
    return (
      <Panel header="Exceptions" key="panel-1" style={{background: 'rgba(255,0,0,0.2)'}}>
        <List dataSource={this.state.node.errorIndices} renderItem={renderItem}/>
      </Panel>
    );
  }

  showLogs = () => {
    const indices: number[] = [];
    for (let i = this.state.node.preIndex; i <= this.state.node.postIndex; i++) {
      indices.push(i);
    }
    const renderItem = (value: number, index: number) => {
      const entity = this.state.entities[value];
      const link = (
        <Link to={{pathname: '/log/detail', hash: value.toString(), state: {entities: this.state.entities}}} key={'link-' + index} smooth={true}>
          <Icon type="right-circle-o"/>
        </Link>
      );
      return (
        <List.Item key={'all-' + index} style={Style.entity(entity.level)} actions={[link]}>
          <div style={Style.wrap}>
            {entity.content.split('\n').map((v, id) =>
              <p style={{margin: 0}} key={id}>{v}</p>
            )}
          </div>
        </List.Item>
      );
    };
    return (
      <Panel header="Log Entries" key="panel-2" style={{background: 'rgba(0,255,0,0.2)'}}>
        <List dataSource={indices} renderItem={renderItem}/>
      </Panel>
    );
  }

  renderState = () => {
    const color = Style.taskStatus(this.state.node.taskStatus);
    return (
      <p style={{display: 'inline-block', marginLeft: '20px', marginRight: '20px'}}>
        Task Status: <span style={color[0]}>{color[1]}</span>
      </p>
    );
  }

  renderErrorType = () => {
    const color = Style.taskError(this.state.node.errorType);
    return (
      <p style={{display: 'inline-block', marginLeft: '20px', marginRight: '20px'}}>
        Error Type: <span style={color[0]}>{color[1]}</span>
      </p>
    );
  }

  genTree = () => (
    <Tree defaultExpandAll={true} showLine={true}>
      <TreeNode title={this.state.node.name + '(dur:' + this.state.node.duration + ' ms)'} key="0" selectable={false}>
        {this.state.node.subTasks.map((node, index) => this.genNode(node, '0', index))}
      </TreeNode>
    </Tree>
  )

  genNode = (node: TaskBean, parentId: string, id: number) => {
    const currentId = parentId + '-' + id;
    const Id = this.state.goalId;
    const date = this.state.date;
    const entity = this.state.entities;
    const status = node.taskStatus;
    const title = (
      <Link to={{pathname: '/log/task', state: {node: node, entities: entity, date: date, id: Id}}} style={Style.task(status, node.errorType)}>
        {currentId + ': ' + node.name + '(dur:' + node.duration + ' ms)'}
      </Link>
    );
    if (node.subTasks === null) {
      return <TreeNode title={title} key={currentId}/>;
    } else {
      return (
        <TreeNode title={title} key={currentId}>
          {node.subTasks.map((subNode, index) => this.genNode(subNode, currentId, index))}
        </TreeNode>
      );
    }
  }

  constructor(props: any) {
    super(props);
    this.state = {
      date: props.location.state.date,
      goalId: props.location.state.id,
      node: props.location.state.node,
      entities: props.location.state.entities
    };
  }

  showPie = (item) => {
    console.log('showPie');
    console.log(item);
    var arr: any = [];
    var tag = 0;
    this.arr2 = [];
    if (item.subTasks === null) {
      arr.push({
        name: item.name,
        value: item.duration,
      });
      this.arr2.push({tag: tag});
    } else {
      const length = item.subTasks.length - 1;
      item.subTasks.forEach((task, index) => {
          if (index === 0) {
            if (item.startTime !== item.subTasks[index].startTime) {
              arr.push({
                name: 'Unknown-1',
                value: item.subTasks[index].startTime - item.startTime,
              });
              tag += 1;
              this.arr2.push({tag: tag});
            }
            arr.push({
              name: item.subTasks[index].name,
              value: item.subTasks[index].duration,
            });
            this.arr2.push({tag: tag});
          } else {
            if (item.subTasks[index - 1].endTime !== item.subTasks[index].startTime) {
              tag += 1;
              arr.push({
                name: 'Unknown-' + tag + 1,
                value: item.subTasks[index].startTime - item.subTasks[index - 1].endTime,
              });
              this.arr2.push({tag: tag});
            }
            arr.push({
              name: item.subTasks[index].name,
              value: item.subTasks[index].duration,
            });
            this.arr2.push({tag: tag});
          }
          if (index === length && item.subTasks[index].endTime !== item.endTime) {
            tag += 1;
            arr.push({
             name: 'Unknown-' + tag,
              value: item.endTime - item.subTasks[index].endTime,
            });
            this.arr2.push({tag: tag - 1});
          }
        });
    }

    var option = {
      tooltip: {show: 'true'},
      color: ['#1890ff', '#7ab275', '#EE82EE', '#FF4500', '#FFA500', '#DA70D6'],
      legend: {
        data: arr,
        x: 'center',
        y: 'bottom',
      },

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
              length: 6,
              length2: 6,
              lineStyle: {
                color: '#333'
              }
            }
          },
          label: {
            normal: {
              formatter:
                '{title|{a}}{abg|}\n {b| {b} }\n {b| Duration:}{value|{c} ms }\n {per|{d}%}\n ',
              backgroundColor: '#eee',
              borderColor: '#aaa',
              borderWidth: 1,
              borderRadius: 2,
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
                hr: {borderColor: '#aaa', width: '100%', borderWidth: 0.5, height: 0},
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
      const item = this.state.itemtaskDataSet.get(index);
      console.log(item);
      console.log(this.state.node);
      var i = param.data.name.indexOf('-');
      if (param.data.name.substring(0, i) === 'Unknown') {
        return;
      }
      if (item === null) {
        return;
      }
      if (this.state.node.subTasks !== null && (item.id !== null)) {
        console.log('axios.post');
        axios.post('/api/log/inceptor/goal', {goalID: this.state.goalId, date: this.state.date}, {timeout: Config.REQUEST_TIMEOUT})
          .then(res => {
            this.props.history.push({
              pathname: '/log/task',
              state: {
                node: this.state.node.subTasks[item.id],
                entities: (res.data as InceptorGoalResponse).goal.entities,
                id: this.state.goalId,
                date: this.state.date,
              }
            });
          })
          .catch(err => {
            notification.error({message: 'ERROR', description: err.message, duration: 3});
          });
      }
    }
  }

  componentWillReceiveProps(props: any) {
    console.log('componentWillReceiveProps');
    console.log(props.location.state.node);
    if (props.location.state.node !== undefined) {
      this.setState({
        node: props.location.state.node,
        entities: props.location.state.entities
      });
      this.showPie(props.location.state.node);
    }
  }

  componentDidMount() {
    console.log('componentDidMount');
    window.scrollTo(0, 0);

    console.log(this.state.node);
    const taskdata = TaskTimeline.tasktimelineData(this.state.node);
    const taskdataSet = TaskTimeline.dataSet(taskdata.items, this.state.node);
    this.setState({
      taskitems: taskdata.items,
      itemtaskDataSet : taskdataSet[0],
    });
    this.showPie(this.state.node);

  }

  render() {
    return (
      <div style={Style.page}>
        <BackTop/>
        <Affix>
          <Button style={{marginLeft: '-70px'}} onClick={this.props.history.goBack}>back</Button>
        </Affix>
        <Link to={{pathname: '/log/detail', state: {entities: this.state.entities}}}>
          <Button type="primary" style={{display: 'inline-block', float: 'right'}}>All Logs</Button>
        </Link>
        <div>
          <h1 style={{display: 'inline-block'}}>{this.state.node.name}</h1>
          {this.renderState()}
          {this.renderErrorType()}
        </div>
        <p style={{marginLeft: '20px'}}>
          <span style={{fontWeight: 'bold'}}>{this.state.node.duration} ms: </span>
          {moment(this.state.node.startTime).format(Config.DATE_TIME_FORMAT)} ~ {moment(this.state.node.endTime).format(Config.DATE_TIME_FORMAT)}
        </p>
        <div style={{marginLeft: '20px'}}>
          <span style={{fontWeight: 'bold'}}>Desc: </span>
          {this.state.node.desc.split('\n').map((value, index) => <p style={{margin: 0}} key={index}>{value}</p>)}
        </div>
        {this.state.node.subTasks !== null && (
          <div style={{marginTop: '20px'}}>
            <h3>Sub Tasks:</h3>
            {this.genTree()}
          </div>
        )}
        <h3 style={{marginTop: '20px'}}>Tasks Pie:</h3>
        <div id="chartmain" style={{width: '500px', height: '400px'}}/>
        <Collapse defaultActiveKey={['panel-1']} style={{marginTop: '20px'}}>
          {this.state.node.errorIndices === null ? '' : this.showExceptions()}
          {this.showLogs()}
        </Collapse>

      </div>

    );
  }
});
