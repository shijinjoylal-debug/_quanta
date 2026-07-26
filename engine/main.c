#include<stdio.h>

int main(){
    int rows = 0;
    int coloumn = 0;
    char symbol = '\0';

    printf("enter no.of rows ");
    scanf("%d",&rows);
    printf("enter no.of coloumns ");
    scanf("%d",&coloumn);
    printf("enter symbol to use ");
    scanf(" %c",&symbol);


    for(int i = 1; i <= rows; i++){
           for(int j = 1; j <= coloumn; j++){
            printf("%c",symbol);
           }
        printf("\n");
    }

    return 0;
}