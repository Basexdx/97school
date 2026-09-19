import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() => runApp(const School97App());

class School97App extends StatelessWidget {
  const School97App({super.key});
  @override Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: '97school',
    theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF171714)), useMaterial3: true, scaffoldBackgroundColor: const Color(0xFFF5F3ED)),
    home: const Shell(),
  );
}

class Task { final String subject, title, answer, hint; final int xp; const Task(this.subject,this.title,this.answer,this.hint,this.xp); }
const tasks = [
  Task('Математика','Решите уравнение: 3x + 7 = 22','5','Перенеси 7 вправо и раздели на 3.',20),
  Task('Математика','Найдите площадь прямоугольника 8 × 7 см','56','S = a × b.',35),
  Task('Физика','120 м пройдены за 20 с. Найдите скорость','6','v = s / t.',40),
  Task('Информатика','Сколько бит в одном байте?','8','Вспомни базовую единицу хранения.',25),
];

class Shell extends StatefulWidget { const Shell({super.key}); @override State<Shell> createState()=>_ShellState(); }
class _ShellState extends State<Shell>{ int tab=0,xp=0; Set<int> solved={};
  @override void initState(){super.initState();load();}
  Future<void> load() async {final p=await SharedPreferences.getInstance();setState((){xp=p.getInt('xp')??0;solved=(p.getStringList('solved')??[]).map(int.parse).toSet();});}
  Future<void> solve(int i) async {if(solved.add(i)){xp+=tasks[i].xp;final p=await SharedPreferences.getInstance();await p.setInt('xp',xp);await p.setStringList('solved',solved.map((e)=>'$e').toList());setState((){});}}
  @override Widget build(BuildContext context){final pages=[Home(xp:xp,solved:solved.length,onTasks:()=>setState(()=>tab=1)),Tasks(solved:solved,onSolved:solve),Rating(xp:xp),Profile(xp:xp,solved:solved.length)];return Scaffold(body:SafeArea(child:pages[tab]),bottomNavigationBar:NavigationBar(selectedIndex:tab,onDestinationSelected:(i)=>setState(()=>tab=i),destinations:const [NavigationDestination(icon:Icon(Icons.home_outlined),selectedIcon:Icon(Icons.home),label:'Главная'),NavigationDestination(icon:Icon(Icons.school_outlined),selectedIcon:Icon(Icons.school),label:'Задачи'),NavigationDestination(icon:Icon(Icons.emoji_events_outlined),selectedIcon:Icon(Icons.emoji_events),label:'Рейтинг'),NavigationDestination(icon:Icon(Icons.person_outline),selectedIcon:Icon(Icons.person),label:'Профиль')]));}
}

class PagePad extends StatelessWidget {final Widget child;const PagePad(this.child,{super.key});@override Widget build(BuildContext context)=>Center(child:ConstrainedBox(constraints:const BoxConstraints(maxWidth:900),child:Padding(padding:const EdgeInsets.all(24),child:child)));}
class Brand extends StatelessWidget{const Brand({super.key});@override Widget build(BuildContext c)=>const Text('97school',style:TextStyle(fontSize:24,fontWeight:FontWeight.w900));}

class Home extends StatelessWidget {final int xp,solved;final VoidCallback onTasks;const Home({super.key,required this.xp,required this.solved,required this.onTasks});@override Widget build(BuildContext c)=>PagePad(ListView(children:[const Brand(),const SizedBox(height:60),const Text('УЧИСЬ • РЕШАЙ • РАСТИ',style:TextStyle(fontSize:12,fontWeight:FontWeight.bold,letterSpacing:2)),const SizedBox(height:14),const Text('Прокачивай знания.\nПоднимайся в рейтинге.',style:TextStyle(fontSize:42,fontWeight:FontWeight.w800,height:1.05)),const SizedBox(height:18),const Text('Решай школьные задачи, получай очки опыта и соревнуйся с другими учениками.',style:TextStyle(fontSize:17,height:1.5)),const SizedBox(height:26),FilledButton(onPressed:onTasks,child:const Padding(padding:EdgeInsets.all(14),child:Text('Начать решать →'))),const SizedBox(height:36),Card(child:Padding(padding:const EdgeInsets.all(24),child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[const Text('Твой прогресс'),const SizedBox(height:10),Text('${(solved/tasks.length*100).round()}%',style:const TextStyle(fontSize:42,fontWeight:FontWeight.bold)),LinearProgressIndicator(value:solved/tasks.length),const SizedBox(height:16),Text('Решено $solved из ${tasks.length} задач  •  $xp XP')])))]));}

class Tasks extends StatelessWidget {final Set<int> solved;final Future<void> Function(int) onSolved;const Tasks({super.key,required this.solved,required this.onSolved});@override Widget build(BuildContext c)=>PagePad(ListView(children:[const Brand(),const SizedBox(height:30),const Text('Задачи',style:TextStyle(fontSize:38,fontWeight:FontWeight.bold)),const SizedBox(height:16),...List.generate(tasks.length,(i){final t=tasks[i];return Card(child:ListTile(contentPadding:const EdgeInsets.all(18),leading:CircleAvatar(child:Text(solved.contains(i)?'✓':'${i+1}')),title:Text(t.subject,style:const TextStyle(fontWeight:FontWeight.bold)),subtitle:Text('${t.title}\n+${t.xp} XP'),isThreeLine:true,trailing:const Icon(Icons.chevron_right),onTap:()=>Navigator.push(c,MaterialPageRoute(builder:(_)=>Solver(task:t,done:solved.contains(i),onSolved:()=>onSolved(i)))));}))]));}
}
class Solver extends StatefulWidget{final Task task;final bool done;final Future<void> Function() onSolved;const Solver({super.key,required this.task,required this.done,required this.onSolved});@override State<Solver> createState()=>_SolverState();}
class _SolverState extends State<Solver>{final ctrl=TextEditingController();String msg='';bool hint=false;@override Widget build(BuildContext c)=>Scaffold(appBar:AppBar(title:Text(widget.task.subject)),body:PagePad(ListView(children:[Text('+${widget.task.xp} XP',style:const TextStyle(fontWeight:FontWeight.bold)),const SizedBox(height:28),Text(widget.task.title,style:const TextStyle(fontSize:30,fontWeight:FontWeight.w600)),const SizedBox(height:30),TextField(controller:ctrl,decoration:const InputDecoration(border:OutlineInputBorder(),labelText:'Твой ответ')),const SizedBox(height:12),FilledButton(onPressed:()async{if(ctrl.text.trim().replaceAll(',','.')==widget.task.answer){await widget.onSolved();setState(()=>msg='Верно! Отличная работа 🎉');}else setState(()=>msg='Пока неверно. Попробуй ещё раз.');},child:const Text('Проверить')),TextButton(onPressed:()=>setState(()=>hint=!hint),child:const Text('Подсказка')),...[if(hint) Card(child:Padding(padding:const EdgeInsets.all(16),child:Text('💡 ${widget.task.hint}'))),if(msg.isNotEmpty) Padding(padding:const EdgeInsets.all(12),child:Text(msg,style:const TextStyle(fontWeight:FontWeight.bold)))]])));}
}
class Rating extends StatelessWidget{final int xp;const Rating({super.key,required this.xp});@override Widget build(BuildContext c){final x=[['Алина',420],['Максим',365],['София',330],['Илья',295],['Ты',xp]];return PagePad(ListView(children:[const Brand(),const SizedBox(height:30),const Text('Рейтинг',style:TextStyle(fontSize:38,fontWeight:FontWeight.bold)),...x.asMap().entries.map((e)=>Card(child:ListTile(leading:CircleAvatar(child:Text('${e.key+1}')),title:Text('${e.value[0]}',style:const TextStyle(fontWeight:FontWeight.bold)),trailing:Text('${e.value[1]} XP'))))]));}}
class Profile extends StatelessWidget{final int xp,solved;const Profile({super.key,required this.xp,required this.solved});@override Widget build(BuildContext c)=>PagePad(ListView(children:[const Brand(),const SizedBox(height:30),const CircleAvatar(radius:42,child:Icon(Icons.person,size:42)),const SizedBox(height:16),const Center(child:Text('Ученик',style:TextStyle(fontSize:28,fontWeight:FontWeight.bold))),const SizedBox(height:25),Card(child:ListTile(title:const Text('Очки опыта'),trailing:Text('$xp XP'))),Card(child:ListTile(title:const Text('Решено задач'),trailing:Text('$solved'))),Card(child:ListTile(title:const Text('Уровень'),trailing:Text(xp>=100?'Исследователь':'Новичок')))]));}
