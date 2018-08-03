import vis from 'vis/dist/vis';
import { TaskBean } from '../LogDataStructure';

export const tasktimelineData = (targetTask: TaskBean): any => {
  const items = {};
  let minTime = 0;
  let maxTime = 0;

  const setRange = (task: TaskBean) => {
    if (minTime === 0 && maxTime === 0) {
      minTime = task.startTime;
      maxTime = task.endTime;
    } else {
      if (task.startTime < minTime) {
        minTime = task.startTime;
      }
      if (task.endTime > maxTime) {
        maxTime = task.endTime;
      }
    }
  };

  console.log(targetTask);
  if (targetTask !== undefined) {
    if (targetTask.subTasks !== null) {
      setRange(targetTask);
      if (items[targetTask.id] === undefined) {
        items[targetTask.id] = [];
      }
      targetTask.subTasks.forEach((task, index) => {
        setRange(task);
        if (items[targetTask.id] === undefined) {
          items[targetTask.id] = [];
        }
        console.log(task.id);
        items[targetTask.id].push({
          id: index,
          group: targetTask.id,
          // content: goal.name,
          name: task.name,
          start: task.startTime,
          end: task.endTime,
        });
      });
    } else {
      const task = targetTask;
      setRange(task);
      if (items[targetTask.id] === undefined) {
        items[targetTask.id] = [];
      }
      console.log(task.id);
      items[targetTask.id].push({
        id: 0,
        group: targetTask.id,
        // content: goal.name,
        name: task.name,
        start: task.startTime,
        end: task.endTime,
      });
    }
  }

  return {
    items: items,
    min: minTime,
    max: maxTime,
  };
};

export const dataSet = (items: {}, targetTask: TaskBean): vis.DataSet[] => {
  console.log(items);
  const itemDataSet = new vis.DataSet();
  const tasks = items[targetTask.id];
  console.log(targetTask);
  console.log(tasks);
  if (tasks !== undefined) {
    tasks.forEach(task => itemDataSet.add({
      id: task.id,
      group: task.group,
      name: task.name,
      start: task.start,
      end: task.end,
      style: task.style,
      title: task.title,
    }));
  }
  return [itemDataSet];
};
