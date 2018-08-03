import { GoalTaskThinBean, TaskBean } from '../LogDataStructure';
import vis from 'vis/dist/vis';

export const goaltimelineData = (targetGoal: GoalTaskThinBean): any => {
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

  if (targetGoal !== undefined) {
    if (targetGoal.tasks !== null) {
      if (items[targetGoal.id] === undefined) {
        items[targetGoal.id] = [];
      }
      targetGoal.tasks.forEach((task, index) => {
        setRange(task);
        if (items[targetGoal.id] === undefined) {
          items[targetGoal.id] = [];
        }
        console.log(task.id);
        items[targetGoal.id].push({
          id: index,
          group: targetGoal.id,
          // content: goal.name,
          name: task.name,
          start: task.startTime,
          end: task.endTime,
        });
      });
    } else {
      const task = targetGoal;
      if (items[targetGoal.id] === undefined) {
        items[targetGoal.id] = [];
      }
      console.log(task.id);
      items[targetGoal.id].push({
        id: 0,
        group: targetGoal.id,
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

export const dataSet = (items: {}, targetGoal: GoalTaskThinBean): vis.DataSet[] => {
  console.log(items);
  const itemDataSet = new vis.DataSet();
  const tasks = items[targetGoal.id];
  console.log(targetGoal);
  console.log(tasks);
  if (tasks !== undefined) {
    tasks.forEach(task => itemDataSet.add({
      id: task.id,
      group: task.group,
      name: task.name,
      start: task.start,
      end: task.end,
      style: task.style,
    }));
  }
  return [itemDataSet];
};
