#include<iostream>
//reccursive
int factorial(int num);


int main(){
int num;
std::cout<<"how many numbers you want to find factorial of";
std::cin>>num;

std::cout<<factorial(num);
return 0;

}
int factorial(int num){
  if(num > 1){
    return num*factorial(num - 1);
  }
  else{
    return 1;
  }
}