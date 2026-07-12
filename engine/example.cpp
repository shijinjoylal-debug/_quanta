#include<iostream>

struct car{
  std::string modal;
  int year;
  std::string color;
};
void printCar(car &car);
void printColor(car &car, std::string color);

int main(){
  car car1;
  car1.modal = "mustang";
  car1.year = 2026;
  car1.color = "red";

  car car2;
  car2.modal = "ferrari";
  car2.year = 2023;
  car2.color = "black";
   
   printColor(car1, "silver");
   printColor(car2, "white");

    printCar(car1);
    printCar(car2);

 return 0;
}
void printCar(car &car){
  std::cout<<car.modal<<std::endl;
  std::cout<<car.year<<std::endl;
  std::cout<<car.color<<std::endl;
}
void printColor(car &car, std::string color){
 car.color = color;
}
